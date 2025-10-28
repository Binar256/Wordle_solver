/**
 * `WordleSolver` is made for solving the *The New York Times Wordle*.
 * It can also be used for some variations of that game, e.g.: custom word list or different amount of guesses.
 * It uses a special algorithm to choose the most optimal word.
 * @class
 */
export default class WordleSolver {
    static #errorMessages = {
        game: "Parameter 'game' must be an object",
        allowedGuesses: "Parameter 'allowedGuesses' must be an array",
        possibleSolutions: "Parameter 'possibleSolutions' must be an array or omitted",
        startingWord: "Parameter 'startingWord' must be a string of length 5 or omitted",
        async: "Parameter 'async' must be a boolean or omitted",
        status: "Status must be an array of length 5",
        value: "Value in status must be an array of length 2",
        letter: "Letter in status must be in alphabet",
        color: "Color in status must be one the wordle colors"
    };
    
    static #alphabet = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
    static #wordLength = 5;

    #allowedGuesses;
    #possibleSolutions;
    #letterStatus;

    #cachedBestWord = null;
    #cachedBestWordArray = null;

    /**
     * @param {string[]} allowedGuesses - list of words of length 5, which can be used for a guessing
     * @param {string[]} [possibleSolutions] - list of words of length 5, where one of them is guaranteed to be a secret word
     */
    constructor(allowedGuesses, possibleSolutions) {
        if (!Array.isArray(allowedGuesses)) throw new Error(WordleSolver.#errorMessages.allowedGuesses);
        if (possibleSolutions !== undefined && !Array.isArray(possibleSolutions)) throw new Error(WordleSolver.#errorMessages.possibleSolutions);

        this.#allowedGuesses = allowedGuesses;
        this.#possibleSolutions = possibleSolutions ?? allowedGuesses;
        this.#letterStatus = WordleSolver.#createLetterStatus();
    }

    /** 
     * @returns {string} 
     *   The best word based on current information.
     *   If the returned word is `""` there is not any word in allowed guesses list
     *   that satisfies the conditions of being a candidate.
     */
    getBestWord() {
        if (this.#cachedBestWord !== null) return this.#cachedBestWord;

        this.#possibleSolutions = WordleSolver.#filterWords(this.#possibleSolutions, this.#letterStatus);
        return this.#cachedBestWord = WordleSolver.#getOptimalWord(this.#allowedGuesses, this.#possibleSolutions, this.#letterStatus);
    }

    /** 
     * @returns {[string, number][]} 
     *   The array of sorted words based on their potential of reducing the set of possible solutions.
     *   The first value in each field is a word and the second one is a number in range `[0, 1]` (the lower the number, the better the word).
     *   If word in the first field is `""` there is not any word in allowed guesses list,
     *   that satisfies conditions of being the candidate for secret word.
     *   Else if the value in the first field is `0`, word in that field is the only word that can be candidate for secret word,
     *   making it the secret word itself.
     */
    getBestWordsSorted() {
        if (this.#cachedBestWordArray !== null) return this.#cachedBestWordArray;

        this.#possibleSolutions = WordleSolver.#filterWords(this.#possibleSolutions, this.#letterStatus);
        return this.#cachedBestWordArray = WordleSolver.#getOptimalWord(this.#allowedGuesses, this.#possibleSolutions, this.#letterStatus, true);
    }

    /**
     * @param  {[string, "grey" | "yellow" | "green"][]} statuses -
     *   `status` is an array, where the first value in each field is a letter at position `index + 1`
     *   and the second one is a color of that letter
     * @returns instance for chaining
     */
    updateStatus(...statuses) {
        this.#cachedBestWord = null;
        this.#cachedBestWordArray = null;

        statuses.forEach(status => {
            if (!Array.isArray(status) || status.length !== WordleSolver.#wordLength) throw Error(WordleSolver.#errorMessages.status);

            status.forEach(val => {
                if (!Array.isArray(val) || val.length !== 2) throw Error(WordleSolver.#errorMessages.value);

                const color = val[1];

                if (!WordleSolver.#alphabet.includes(val[0]?.toLowerCase())) throw Error(WordleSolver.#errorMessages.letter);
                if (color !== "green" && color !== "yellow" && color !== "grey") throw Error(WordleSolver.#errorMessages.color);
            });

            WordleSolver.#changeLetterStatus(this.#letterStatus, status);
        }); 

        return this;
    }

    /**
     * Directly plays a given wordle game. Useful for automated solving.
     * 
     * @param {Object} game - any object that has a method `guess` which accepts a string and returns a `status` object, which contains:
     *   - `result: [string, "grey" | "yellow" | "green"][],` - array containing fields, where the first value is letter and the second one is color of that letter
     *   - `guesses: number,` - number of used guesses
     *   - `win: boolean,` - boolean indicating whether the game won
     *   - `end: boolean` - boolean indicating whether the game ended
     *   
     * @param {string[]} allowedGuesses - list of allowed guesses, which can be used be solver
     * @param {Object} [options] - optional parameters
     * @param {string[]} [options.possibleSolutions] - list of possible guesses, where one of them is guaranteed to be a secret word
     * @param {string} [options.startingWord] - word that will be used as a first guess
     * @param {boolean} [options.async] - used when `guess` method is async
     *
     * @returns {{
     *   guesses: string[], // array of words in order, in which they were used as guesses 
     *   guessCount: number, // number of used guesses
     *   win: boolean, // boolean indicating whether the solver guessed the secret word
     *   time: number // time in ms it took the solver to finish the game
     * }|Promise<Object>} returns promise if async is `true`
     */
    static solve(game, allowedGuesses, { possibleSolutions, startingWord = "", async = false }) {
        if (typeof game !== "object" || game === null) throw new Error(WordleSolver.#errorMessages.game);
        if (!Array.isArray(allowedGuesses)) throw new Error(WordleSolver.#errorMessages.allowedGuesses);
        if (possibleSolutions !== undefined && !Array.isArray(possibleSolutions)) throw new Error(WordleSolver.#errorMessages.possibleSolutions);
        if (startingWord !== "" && (typeof startingWord !== "string" || startingWord.length !== WordleSolver.#wordLength)) throw new Error(WordleSolver.#errorMessages.startingWord);
        if (typeof async !== "boolean") throw new Error(WordleSolver.#errorMessages.async);

        const start = performance.now();
        const guesses = [];
        const letterStatus = WordleSolver.#createLetterStatus();

        possibleSolutions = possibleSolutions ?? allowedGuesses;

        if (!async) {
            let status = game.guess(startingWord || WordleSolver.#getOptimalWord(allowedGuesses, possibleSolutions, letterStatus));

            while (!status.end) {
                WordleSolver.#changeLetterStatus(letterStatus, status.result);
                possibleSolutions = WordleSolver.#filterWords(possibleSolutions, letterStatus);

                const guess = WordleSolver.#getOptimalWord(allowedGuesses, possibleSolutions, letterStatus)
                guesses.push(guess);

                status = game.guess(guess);
            }

            return {
                guesses,
                guessCount: status.guesses,
                win: status.win,
                time: performance.now() - start,
            };
        }   
        
        return (async () => {
            let status = startingWord ? await game.guess(startingWord) : WordleSolver.#getOptimalWord(allowedGuesses, possibleSolutions, letterStatus);

            while (!status.end) {
                WordleSolver.#changeLetterStatus(letterStatus, status.result);
                possibleSolutions = WordleSolver.#filterWords(possibleSolutions, letterStatus);

                const guess = WordleSolver.#getOptimalWord(allowedGuesses, possibleSolutions, letterStatus)
                guesses.push(guess);

                status = await game.guess(guess);
            }

            return {
                guesses,
                guessCount: status.guesses,
                win: status.win,
                time: performance.now() - start,
            };
        })();
    }

    static #createLetterStatus() {
        return { 
            green: Array(WordleSolver.#wordLength),
            yellow: new Map(WordleSolver.#alphabet.map(letter => ([letter, Array(WordleSolver.#wordLength).fill(false)]))),
            count: new Map(WordleSolver.#alphabet.map(letter => ([letter, { 
                green: 0,
                yellow: 0,
                total: 0,
                fixed: false 
            }])))
        };
    }

    static #getLetterOccurrence(possibleSolutions) {
        const length = possibleSolutions.length;
        const alphabetLength = WordleSolver.#alphabet.length;
        const occurrence = WordleSolver.#alphabet.reduce((acc, letter) => {
            acc[letter] = { 
                total: 0, 
                atPosition: Array(WordleSolver.#wordLength).fill(0) 
            };

            return acc;
        }, {});

        for (let i = 0; i < length; i++) {
            const word = possibleSolutions[i];
            const used = new Set();

            for (let j = 0; j < WordleSolver.#wordLength; j++) {
                const letter = word[j];

                if (!used.has(letter)) {
                    used.add(letter);
                    occurrence[letter].total++;
                }
                
                occurrence[letter].atPosition[j]++;
            }
        }

        for (let i = 0; i < alphabetLength; i++) {
            const letterOccurrence = occurrence[WordleSolver.#alphabet[i]];
            letterOccurrence.total = letterOccurrence.total / length;

            for (let j = 0; j < WordleSolver.#wordLength; j++) letterOccurrence.atPosition[j] = letterOccurrence.atPosition[j] / length;
        }

        return occurrence;
    };

    static #getOptimalWord(allowedGuesses, filteredWords, letterStatus, returnAllValues = false) {
        if (filteredWords.length <= 1) return returnAllValues ? [[filteredWords[0] ?? "", 0]] : filteredWords[0] ?? "";

        const occurrence = WordleSolver.#getLetterOccurrence(filteredWords);
        const values = [];
        const length = allowedGuesses.length;
        let minVal = Infinity;
        let bestWord = "";

        for (let i = 0; i < length; i++) {
            const word = allowedGuesses[i];
            const letterCount = {};
            const unavailablePositions = Array(WordleSolver.#wordLength).fill(false);

            let val = 1;

            for (let j = 0; j < WordleSolver.#wordLength; j++) {
                const letter = word[j];

                if (letterStatus.green[j] === letter || letterStatus.yellow.get(letter)[j]) {
                    letterCount[letter] = (letterCount[letter] ?? 0) + 1;
                    unavailablePositions[j] = true;
                }
            }

            for (let j = 0; j < WordleSolver.#wordLength; j++) {
                const letter = word[j];
                const count = letterStatus.count.get(letter);
                const currentCount = letterCount[letter] ?? 0;
                const data = occurrence[letter];
                
                if ((currentCount >= count.total && count.fixed) || currentCount >= (count.total || 1) || unavailablePositions[j]) continue
                
                letterCount[letter] = currentCount + 1;

                val *= (data.atPosition[j] ** 2) + ((data.total - data.atPosition[j]) ** 2) + ((1 -  data.total) ** 2)
            }  

            if (returnAllValues) values.push([word, val]);
            else if (val < minVal) {
                minVal = val;
                bestWord = word;
            }
        }

        return returnAllValues ? values.sort((a, b) => a[1] - b[1]) : bestWord;
    }; 

    static #changeLetterStatus(letterStatus, status) {
        const tempCount = WordleSolver.#alphabet.reduce((acc, val) => {
            acc[val] = {
                total: 0,
                count: 0,
                newGreen: 0
            };

            return acc;
        }, {});

        status.forEach(([letter, state], i) => {
            letter = letter.toLowerCase();
            const letterCount = letterStatus.count.get(letter);      

            switch (state) {
                case "green":
                    if (!letterStatus.green[i]) {
                        letterStatus.green[i] = letter;
                        tempCount[letter].newGreen++;  
                        tempCount[letter].total++;
                    } else {
                        tempCount[letter].count++;
                        if (tempCount[letter].count > letterCount.green) tempCount[letter].total++;
                    }

                    break;
                case "yellow": 
                    letterStatus.yellow.get(letter)[i] = true;
                    tempCount[letter].count++;
                    if (tempCount[letter].count > letterCount.green) tempCount[letter].total++;

                    break;
                case "grey": 
                    letterCount.fixed = true;
                    break;
            }
        });

        Object.entries(tempCount).forEach(([letter, { total, newGreen }]) => {
            const letterCount = letterStatus.count.get(letter);

            if (letterCount.total < total + letterCount.green) letterCount.total = total + letterCount.green;
            letterCount.green += newGreen;
            letterCount.yellow = letterCount.total - letterCount.green;
        });
    };

    static #filterWords(possibleSolutions, letterStatus) {
        const length = possibleSolutions.length;
        const filteredWords = [];

        main: for (let i = 0; i < length; i++) {
            const word = possibleSolutions[i];
            const letterCount = {};

            for (let j = 0; j < WordleSolver.#wordLength; j++) {
                const letter = word[j];
                if ((letterStatus.green?.[j] ?? letter) !== letter || letterStatus.yellow.get(letter)[j]) continue main;
                letterCount[letter] = (letterCount[letter] ?? 0) + 1;
            }

            for (const [letter, statusCount] of letterStatus.count.entries()) {
                const count = letterCount[letter] ?? 0;
                if (statusCount.total !== count && (statusCount.fixed || statusCount.total > count)) continue main;
            }

            filteredWords.push(word);
        }
    
        return filteredWords;
    };
};