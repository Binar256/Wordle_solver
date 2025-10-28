[![GitHub](https://badgen.net/badge/icon/GitHub/010409?icon=github&label)](https://github.com/Binar256/Wordle_solver)
[![NPM](https://img.shields.io/badge/NPM-red?logo=npm)](https://www.npmjs.com/package/@binar256/wordle-solver)
[![version](https://img.shields.io/npm/v/@binar256/wordle-solver)](https://www.npmjs.com/package/@binar256/wordle-solver)
[![licence](https://img.shields.io/npm/l/@binar256/wordle-solver?color=007ec6)](https://github.com/Binar256/Wordle_solver/blob/main/LICENSE)
# Wordle Solver

A Wordle solver is designed for solving *The New York Times Wordle* game, or any games based on the same mechanics.
Solver comes up with a simulation of the Wordle game for testing purposes or simply to be played, and with a list of allowed guesses and possible solutions. 

## Getting Started
All you need is the Wordle solver with a list of allowed guesses. To increase solving performance you can also use a list of possible solutions.

### Where to Get the Word Lists
If you want to use the solver for the official Wordle game, this repository includes both the list of [allowed guesses](https://github.com/Binar256/Wordle_solver/tree/main/word_lists/allowed_guesses.txt) and [possible solutions](https://github.com/Binar256/Wordle_solver/tree/main/word_lists/possible_solutions.txt).

> Note that those lists are outdated due to the expansion of possible solutions in the official game.
> Using only the list of allowed guesses is generally safer, because the list of possible solutions might not include the secret word, so the solver may fail to guess it.

### Installation
```bash
npm install @binar256/wordle-solver
```
### Import Options
ESM
```js
import WordleSolver from "@binar256/wordle-solver";
import Wordle from "@binar256/wordle-solver/wordle";
import { WordleSolver, Wordle } from "@binar256/wordle-solver";
```

CJS
```js
const WordleSolver = require("@binar256/wordle-solver");
const Wordle = require("@binar256/wordle-solver/wordle");
```

### Basic Examples

```js
import WordleSolver from "@binar256/wordle-solver";

const solver = new WordleSolver(allowedGuesses, possibleSolutions);

// e.g. you have guessed a word CRANE and letters have turned: 🟩🟨⬛🟨⬛,
solver.updateStatus([
  ["C", "green"],
  ["R", "yellow"],
  ["A", "grey"],
  ["N", "yellow"],
  ["E", "grey"]
]);

console.log(solver.getBestWord())
// output: e.g. "hover"
```
If you want the solver to directly play the game, you can use a static `solve` method (async mode available).

```js
// imports Wordle for simulating the game
import { Wordle, WordleSolver } from "@binar256/wordle-solver";

const wordle = new Wordle(possibleSolutions, allowedGuesses)

// creates an instance of WordleGame
const game = wordle.createGame()
/* game can be any object, which fulfills the conditions written in JSDoc,
   which allows you to pass your own interface for Wordle game */

WordleSolver.solve(game, allowedGuesses, {
	// options
	possibleSolutions,
	startingWord, // word used as the first guess,
	async // whether is the game async
});
// output: object containing results of the game
```

## Documentation
Code is documented by JSDoc, available directly in [src](https://github.com/Binar256/Wordle_solver/tree/main/src) files.

## Algorithm Used by the Wordle Solver
Solver is based on special algorithm that uses occurrence of letters on each position and an expected value formula to calculate the word that could reduce the possible solutions as much as possible.  
The main steps:

1. Iterate through all possible solutions and count occurrence of each letter on each position.
2. Iterate through all allowed guesses. 
	1. Calculate the expected value for each letter $l$ using this formula:  
	$$E(letter) = p_p ^2 + (p_t - p_p)^2 + (1 - p_t)^2$$  
		$p_t$ - probability of letter turning yellow  
		$p_p$ - probability of word turning green
		
		Terms in formula represent a probability of letter being green, yellow or grey.  
		Each element is squared because its value is same as its probability. 
	
	3. Multiply the expected values of letters in word to approximate the reducing power of each word.

	4. Pick the word with the lowest value (e.g. value $0.3$ means the total amount of possible guesses is expected to be reduced by $\times0.3$).
3. Filter the possible guesses based on a result of the guess.
4. Repeat if necessary.

Some steps may be slightly simplified, for more details see the [code](https://github.com/Binar256/Wordle_solver/blob/main/src/wordle_solver.js).

## Testing
If you want to test different word lists or conditions, download the [tests](https://github.com/Binar256/Wordle_solver/blob/main/tests) folder.
Use [test_config.json](https://github.com/Binar256/Wordle_solver/blob/main/tests/test_config.json) to set different parameters.  

### Running tests
```bash
node test.js
```

You can use Wordle solver directly in the terminal by running:
```bash
node test.js --play --number
```
> number - optional, specifies how many words should the solver suggest.

It will prompt you to enter an input in the form `[word] [color on each position]`  
Example:
```bash
node test.js -p 2
Enter a status: crane ryrgr
[
	[ 'tours', 0.13969838619232178 ],
	[ 'hours', 0.13969838619232178 ]
]
Enter a status:
```
Color codes:
 - g - green
 - y - yellow
 - r - grey

## License
This project is licensed under [GNU General Public License v3.0 or later](https://www.gnu.org/licenses/gpl-3.0.html)