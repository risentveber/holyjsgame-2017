import { CELL_HEIGHT, CELL_WIDTH, CELL_SIZE } from '../constants';
import { key, computeShortestPath } from '../helpers/computeShortestPath';
import {
	showInfo, setPercents, setCounter, isCollectCoinsModeEnabled,
	isFoundExitModeEnabled, isStrategyRunning, getSpeed
} from '../ui';
import { WALL, FLOOR, getMaze } from '../mazeGenerator'

let direction;
let score = -1;
let elems = null;
let totalFloorCount = -1;
let exitFound = false;
let totalTurnsCount = 0;

export default class GameState extends Phaser.State {
	create() {
		const wallsGroup = this.game.add.group();
		this.walls = wallsGroup;
		wallsGroup.enableBody = true;
		const floorsGroup = this.game.add.group();
		const coinsGroup = this.game.add.group();
		const finalGroup = this.game.add.group();
		this.final = finalGroup;
		this.coins = coinsGroup;

		elems = getMaze(false);

		for (let y = 0; y < CELL_HEIGHT; y++) {
			for (let x = 0; x < CELL_WIDTH; x++) {
				if (elems[x][y] === WALL) {
					const wall = wallsGroup.create(x * CELL_SIZE, y * CELL_SIZE, "wall");
					wall.body.immovable = true;
				} else {
					const fl = floorsGroup.create(x * CELL_SIZE, y * CELL_SIZE, "floor");

					this.game.physics.arcade.enable(fl);
					this.game.physics.arcade.overlap(fl, wallsGroup, function (floor, wall) {
						wall.destroy();
					});
					if(x + 1 === CELL_WIDTH && y + 1 === CELL_HEIGHT) {
						this.game.physics.arcade.enable(finalGroup.create(x * CELL_SIZE, y * CELL_SIZE, "final"));
					} else {
						totalFloorCount++;
						this.game.physics.arcade.enable(coinsGroup.create(x * CELL_SIZE + 4, y * CELL_SIZE + 4, "coin"));
					}
				}
			}
		}

		this.player = this.game.add.sprite(0, 0, "player");
		this.game.physics.arcade.enable(this.player);
		this.player.body.setSize(16, 16);
		this.player.body.collideWorldBounds = true;
		// this.cursors = this.game.input.keyboard.createCursorKeys();
		// const onKeyUp = (event) => {
		// 	if (!window.mode.checked) {
		// 		switch (event.keyCode) {
		// 			case Phaser.Keyboard.LEFT:
		// 				direction = 'left';
		// 				break;
		// 			case Phaser.Keyboard.RIGHT:
		// 				direction = 'right';
		// 				break;
		// 			case Phaser.Keyboard.UP:
		// 				direction = 'up';
		// 				break;
		// 			case Phaser.Keyboard.DOWN:
		// 				direction = 'down';
		// 				break;
		// 		}
		// 	}
		// };
		// this.game.input.keyboard.addCallbacks(null, null, onKeyUp);

		const canMove = name => {
			let x = Math.floor(this.player.body.x / CELL_SIZE);
			let y = Math.floor(this.player.body.y / CELL_SIZE);
			
			switch (name) {
				case 'left':
					x -= 1;
					break;
				case 'right':
					x += 1;
					break;
				case 'up':
					y -= 1;
					break;
				case 'down':
					y += 1;
					break;
			}
			
			return elems[x] && elems[x][y] === FLOOR;
		};

		const goTo = name => {
			if(canMove(name) && score !== totalFloorCount && !exitFound) {
				totalTurnsCount++;
				direction = name;
			}
		};

		const maze = [];

		for (let x = 0; x < CELL_WIDTH; x++) {
			maze[x] = [];
			for (let y = 0; y < CELL_HEIGHT; y++) {
				maze[x][y] = +(elems[x][y] === WALL);
			}
		}

		this.distances = computeShortestPath(CELL_WIDTH - 1, CELL_HEIGHT - 1, maze);

		window.strategy = () => {};

		const step = () => {
			let x = Math.floor(this.player.body.x / CELL_SIZE);
			let y = Math.floor(this.player.body.y / CELL_SIZE);

			if (isStrategyRunning() && !direction) {
				strategy(goTo, canMove, x, y, maze)
			}
			setTimeout(step, getSpeed());
		};

		step();
	}

	update() {
		if(direction) {
			switch (direction) {
				case 'left':
					this.player.body.x -= 16;
					break;
				case 'right':
					this.player.body.x += 16;
					break;
				case 'up':
					this.player.body.y -= 16;
					break;
				case 'down':
					this.player.body.y += 16;
					break;
			}
			direction = null;
		}
		
		this.game.physics.arcade.overlap(this.player, this.coins, (p, f) => {
			f.kill();
			score++;
			if(isCollectCoinsModeEnabled() && score === totalFloorCount) {
				setTimeout(() => showInfo('Победа! Вы собрали все монетки.'), 500);
			}
		}, null, this);
		this.game.physics.arcade.overlap(this.player, this.final, () => {
			if(isFoundExitModeEnabled() && !exitFound) {
				exitFound = true;
				setTimeout(() => showInfo('Победа! Вы нашли выход.'), 500);
			}
		}, null, this);
		this.game.physics.arcade.collide(this.player, this.walls);
	}

	render() {
		let x = Math.floor(this.player.body.x / CELL_SIZE);
		let y = Math.floor(this.player.body.y / CELL_SIZE);
		let percents;
		let counter;

		if(isFoundExitModeEnabled()) {
			counter = this.distances[key(x,y)];
			percents = Math.max(0, Math.floor(100 - counter/this.distances[key(0,0)] * 100));

		} else {
			percents = Math.floor(score/totalFloorCount * 100);
			counter = totalTurnsCount;
		}

		setPercents(percents);
		setCounter(counter);
	}
}

