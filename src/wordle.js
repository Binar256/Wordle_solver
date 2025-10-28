/**
 * `Wordle` is a simulation of *The New York Times Wordle*. 
 * It enforces the same rules as the original game, making this class useful for testing purposes.
 * To use it, you have to provide a list of possible solutions and optionally a list of allowed guesses.
 * @class
 */
export default class Wordle {
    #allowedGuesses;
    #possibleSolutions;
    #allowedGuessesSet = new Set();

    /**
     * @param {string[]} possibleSolutions - list of words of length 5, which can be selected as secret words
     * @param {string[]} [allowedGuesses] - list of words of length 5, which represents allowed guesses, if omitted, any word of length 5 can be a guess.
     */
    constructor(possibleSolutions, allowedGuesses) {
        if (!Array.isArray(possibleSolutions)) throw new Error("Parameter 'possibleSolutions' must be an array");
        if (allowedGuesses !== undefined && !Array.isArray(allowedGuesses)) throw new Error("Parameter 'allowedGuesses' must be an array or omitted");
        if (possibleSolutions.length === 0) throw new Error("Parameter 'possibleSolutions' cannot be an empty array");
        if (allowedGuesses?.length === 0) throw new Error("Parameter 'allowedGuesses' cannot be an empty array");

        this.#possibleSolutions = possibleSolutions;
        this.#allowedGuesses = allowedGuesses;

        let length = this.#possibleSolutions.length;
        for (let i = 0; i < length; i++) this.#allowedGuessesSet.add(this.#possibleSolutions[i]);

        if (!this.#allowedGuesses) return;

        length = this.#allowedGuesses.length;
        for (let i = 0; i < length; i++) this.#allowedGuessesSet.add(this.#allowedGuesses[i]);
    }

    /**
     * Create a new WordleGame with a random word from the possible solutions provided to this Wordle instance.
     * 
     * @param {string} [wordToGuess] - explicitly sets the word as a secret word
     * @returns {WordleGame}
     */
    createGame(wordToGuess) {
        return new this.#WordleGame(this, wordToGuess);
    }

    /**
     * @typedef {Object} WordleGame
     * @property {(word: string) => {
     *   result: [string, "grey" | "yellow" | "green"][],
     *   guesses: number,
     *   win: boolean,
     *   end: boolean
     * }} guess - Makes a guess attempt. Maximum amount of guess attempts is 6.
     * @property {() => string} revealWord - Ends the game and returns the secret word.
     * @property {{
     *   result: [string, "grey" | "yellow" | "green"][],
     *   guesses: number,
     *   win: boolean,
     *   end: boolean
     * }} status - Returns the last status of the game returned by `guess` or `undefined` if no guess has been made
     */

    /** 
     * Internal class used for creating wordle game, with word list from `Wordle` class. 
     * @class
     */
    #WordleGame = class WordleGame {
        static #wordLength = 5;
        static #guessLimit = 6;
        static #MAX_INT = 2 ** 32 - 1;

        #wordle;
        #word;
        #letterCount;
        #guessCount = 0;
        #end = false;
        #win = false;
        #status = {};

        constructor(wordle, wordToGuess = "") {
            try {
                wordle.#allowedGuesses;
            } catch {
                throw Error("Parameter 'wordle' must be an Wordle instance");
            }

            if (wordToGuess !== "" && (typeof wordToGuess !== "string" || wordToGuess.length !== WordleGame.#wordLength)) throw Error("Parameter 'wordToGuess' must be a string of length 5 or omitted");

            this.#wordle = wordle;
            this.#word = (wordToGuess !== "" && wordle.#allowedGuessesSet.has(wordToGuess) ? wordToGuess : this.#getRandomWord()).split("");
            this.#letterCount = this.#word.reduce((acc, val) => {
                acc[val] = (acc[val] ?? 0) + 1
                return acc;
            }, {});
        }

        #getRandomWord() {
            const number = this.#wordle.#possibleSolutions.length;
            const limit = Math.floor(WordleGame.#MAX_INT / number) * number;
            const uInt32Arr = new Uint32Array(1);

            let random = Infinity;

            while (random >= limit) random = crypto.getRandomValues(uInt32Arr)[0];
            return this.#wordle.#possibleSolutions[random % number];
        } 

        guess(word) {
            if (this.#end) throw new Error("Game has already ended");
            if (typeof word !== "string" || word.length !== WordleGame.#wordLength) throw Error(`Parameter 'word' must be a string of length ${WordleGame.#wordLength}`);
            if (this.#wordle.#allowedGuesses && !this.#wordle.#allowedGuessesSet.has(word)) throw Error("Guess word is not in allowed guesses")
            if (this.#guessCount++ === WordleGame.#guessLimit) this.#end = true;

            word = word.toLowerCase();

            const result = Array.from(word, letter => ([letter, "grey"]));
            const tempLetterCount = { ...this.#letterCount };

            this.#win = true;

            this.#word.forEach((letter, i) => {
                const guessLetter = word[i];

                if (guessLetter === letter) {
                    result[i][1] = "green";
                    tempLetterCount[letter]--;
                } else this.#win = false;
            });

            if (this.#win) this.#end = true;
            else this.#word.forEach((letter, i) => {
                const guessLetter = word[i];

                if (this.#word.includes(guessLetter) && guessLetter !== letter && tempLetterCount[guessLetter] > 0) {
                    result[i][1] = "yellow";
                    tempLetterCount[guessLetter]--;
                }
            });

            return this.#status = {
                result,
                guesses: this.#guessCount,
                win: this.#win,
                end: this.#end = this.#win || this.#guessCount === WordleGame.#guessLimit
            };
        }

        revealWord() {
            this.#end = true;
            return this.#word.join("");
        }

        get status() {
            return this.#status;
        }
    }
}