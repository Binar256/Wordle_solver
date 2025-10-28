import fs from "fs";
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import path from "path";
import readline from "readline";
import Wordle from "../src/wordle.js";
import WordleSolver from "../src/wordle_solver.js";
import config from "./test_config.json" with { type: "json" };

const dirname = path.dirname(fileURLToPath(import.meta.url));

const terminalWordleSolverConfig = config.terminalWordleSolver;
const testConfig = config.test;
const testOptions = config.test.options;
const relativePaths = config.relativePaths;

try {
    const allowedGuesses = (await readFile(path.join(dirname, relativePaths.allowedGuesses), "utf-8")).split("\n");
    const possibleSolutions = testOptions.omitPossibleSolutions ? allowedGuesses : (await readFile(path.join(dirname, relativePaths.possibleSolutions), "utf-8")).split("\n");

    const args = process.argv.slice(2);
    const numOfSuggestedWords = args.find(val => {
        const number = Number(val.slice(2))
        return Number.isInteger(number) && number > 0;
    })?.slice(2);

    if (args.some(val => val === "-p" || val === "--play")) terminalWordleSolver(allowedGuesses, possibleSolutions, numOfSuggestedWords);
    else {
        if (testConfig.runStatic) await staticTest(allowedGuesses, possibleSolutions, testOptions.startingWord, testOptions.async);
        if (testConfig.runInstance) instanceTest(allowedGuesses, possibleSolutions, testOptions.startingWord, testOptions.runWithSortingWords);
    }
} catch (err) {
    throw err;
}

async function staticTest(allowedGuesses, possibleSolutions, startingWord, async) {
    const length = possibleSolutions.length;
    const data = [];
    const wordle = new Wordle(possibleSolutions, allowedGuesses);
    let i = 0;

    while (i < length) {
        const game = wordle.createGame(possibleSolutions[i]);
        const start = performance.now();

        if (async) await WordleSolver.solve(game, allowedGuesses, { possibleSolutions, startingWord, async });
        else WordleSolver.solve(game, allowedGuesses, { possibleSolutions, startingWord, async });

        const status = game.status;
        
        data.push({
            index: i,
            word: possibleSolutions[i],
            guessCount: status.guesses,
            time: performance.now() - start,
            win: status.win
        });

        i++; 
    }
    
    processData(data, allowedGuesses, possibleSolutions, "static");
}

function instanceTest(allowedGuesses, possibleSolutions, startingWord, getSortedWords) {
    const length = possibleSolutions.length;
    const data = [];
    const wordle = new Wordle(possibleSolutions, allowedGuesses);
    let i = 0;

    while (i < length) {
        const game = wordle.createGame(possibleSolutions[i]);
        const start = performance.now();
        const solver = new WordleSolver(allowedGuesses, possibleSolutions);
        const getBestWord = getSortedWords ? () => solver.getBestWordsSorted()[0][0] : solver.getBestWord.bind(solver);

        let status = game.guess(startingWord || getBestWord());

        while (!status.end) {
            solver.updateStatus(status.result);
            status = game.guess(getBestWord());
        }

        data.push({
            index: i,
            word: possibleSolutions[i],
            guessCount: status.guesses,
            time: performance.now() - start,
            win: status.win
        });

        i++; 
    }

    processData(data, allowedGuesses, possibleSolutions, "instance" );
}

function processData(data, allowedGuesses, possibleSolutions, testType) {
    const reduced = data.reduce((acc, val) => {
        acc.guessCountOnPosition[val.guessCount - 1]++;
        acc.totalTimeInS += val.time;
        acc.totalGuessCount += val.guessCount;
        acc.wins += val.win;
        acc.losses += !val.win;

        return acc;
    }, {
        testType,
        startingWord: testOptions.startingWord,
        allowedGuessesLength: allowedGuesses.length,
        possibleSolutionsLength: possibleSolutions.length,
        wins: 0,
        losses: 0,
        totalTimeInS: 0,
        averageTimeInMS: 0,
        totalGuessCount: 0,
        averageGuesses: 0,
        guessCountOnPosition: Array(6).fill(0),
        guessPercentage: 0
    }); 

    reduced.averageTimeInMS = reduced.totalTimeInS / reduced.possibleSolutionsLength;
    reduced.totalTimeInS /= 1000;
    reduced.averageGuesses = reduced.totalGuessCount / reduced.possibleSolutionsLength;
    reduced.guessPercentage = reduced.guessCountOnPosition.map(val => val / reduced.possibleSolutionsLength * 100);

    const pathToPerformance = path.join(dirname, relativePaths.performanceDir);
    let id = 0;

    if (testOptions.createTotalPerformanceFile || testOptions.createDetailedPerformanceFile) {
        fs.mkdirSync(pathToPerformance, { recursive: true });
        while (fs.existsSync(path.join(pathToPerformance, `total_performance_${id}.json`)) && fs.existsSync(path.join(pathToPerformance, `detailed_performance_${id}.json`))) id++;
    }

    if (testOptions.createTotalPerformanceFile) {
        fs.writeFile(path.join(pathToPerformance, `total_performance_${id}.json`), JSON.stringify(reduced, null, 2), e => {
            if (e) throw e;
        });
    }

    if (testOptions.createDetailedPerformanceFile) {
        fs.writeFile(path.join(pathToPerformance, `detailed_performance_${id}.json`), JSON.stringify(data, null, 2), e => {
            if (e) throw e;
        });
    }

    if (testOptions.logTotalPerformance) console.log(reduced)
}

async function terminalWordleSolver(allowedGuesses, possibleSolutions, numOfSuggestedWords = terminalWordleSolverConfig.numOfSuggestedWords) {
    const wordLength = terminalWordleSolverConfig.wordLength;
    const readInput = rl => new Promise(resolve => rl.question("Enter a status: ", resolve));
    const inputToStatus = input => {
        const words = input.slice(0, wordLength).toLowerCase().split("");
        const colors = input.slice(wordLength + 1, wordLength * 2 + 1).toLowerCase().split("");

        return Array.from(words, (letter, i) => {
            const color = colors[i].toLowerCase();
            return [letter, color === "g" ? "green" : color === "y" ? "yellow" : color === "r" ? "grey" : ""];
        });
    };

    const solver = new WordleSolver(allowedGuesses, possibleSolutions);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    let input = await readInput(rl);

    while (input !== "") {
        const bestWord = solver.updateStatus(inputToStatus(input)).getBestWordsSorted().splice(0, numOfSuggestedWords);
        console.log(bestWord.length === 1 ? bestWord[0] : bestWord);
        input = await readInput(rl);
    }

    rl.close();
}