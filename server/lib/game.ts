import {
  Game,
  GameStatus,
  GameResult,
  Maze,
  Position,
  Direction,
  Facing,
  Player,
  Mouse,
  CellType,
  VisibleState,
  MouseAction,
} from './types'
import { generateMaze } from './maze'

const DEFAULT_MAX_TURNS = 200
const DEFAULT_MAZE_SIZE = 15

function posKey(x: number, y: number): string {
  return `${x},${y}`
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

/**
 * Create a new game with a generated maze
 */
export function createGame(mazeSize: number = DEFAULT_MAZE_SIZE, maxTurns: number = DEFAULT_MAX_TURNS): Game {
  const { maze, entrance, exit } = generateMaze(mazeSize)
  return createGameWithMaze(maze, entrance, exit, maxTurns)
}

/**
 * Create a new game with a specific maze (useful for testing)
 */
export function createGameWithMaze(
  maze: Maze,
  entrance: Position,
  exit: Position,
  maxTurns: number = DEFAULT_MAX_TURNS
): Game {
  return {
    maze,
    entrance,
    exit,
    players: [],
    turn: 0,
    maxTurns,
    status: 'WAITING',
    result: null,
  }
}

/**
 * Add a player to the game
 */
export function addPlayer(game: Game, name: string, prompt: string): Game {
  if (game.players.length >= 2) {
    throw new Error('Game already has 2 players')
  }

  if (game.status !== 'WAITING') {
    throw new Error('Cannot add player to a game that is not waiting')
  }

  const mouse: Mouse = {
    position: { ...game.entrance },
    facing: 'EAST', // Start facing right (towards exit on right side)
    explored: new Set([posKey(game.entrance.x, game.entrance.y)]),
    actionHistory: [],
  }

  // Expand initial explored area to what the mouse can see
  expandExplored(game.maze, mouse)

  const player: Player = {
    id: generateId(),
    name,
    prompt,
    mouse,
  }

  const newPlayers = [...game.players, player]
  const newStatus: GameStatus = newPlayers.length === 2 ? 'PLAYING' : 'WAITING'

  return {
    ...game,
    players: newPlayers,
    status: newStatus,
  }
}

/**
 * Get the position in front of the mouse based on facing
 */
export function getPositionInFront(pos: Position, facing: Facing): Position {
  switch (facing) {
    case 'NORTH': return { x: pos.x, y: pos.y - 1 }
    case 'SOUTH': return { x: pos.x, y: pos.y + 1 }
    case 'EAST': return { x: pos.x + 1, y: pos.y }
    case 'WEST': return { x: pos.x - 1, y: pos.y }
  }
}

/**
 * Get the position to the left of the mouse
 */
export function getPositionToLeft(pos: Position, facing: Facing): Position {
  const leftFacing = turnLeft(facing)
  return getPositionInFront(pos, leftFacing)
}

/**
 * Get the position to the right of the mouse
 */
export function getPositionToRight(pos: Position, facing: Facing): Position {
  const rightFacing = turnRight(facing)
  return getPositionInFront(pos, rightFacing)
}

/**
 * Turn left 90°
 */
export function turnLeft(facing: Facing): Facing {
  const turns: Record<Facing, Facing> = {
    NORTH: 'WEST',
    WEST: 'SOUTH',
    SOUTH: 'EAST',
    EAST: 'NORTH',
  }
  return turns[facing]
}

/**
 * Turn right 90°
 */
export function turnRight(facing: Facing): Facing {
  const turns: Record<Facing, Facing> = {
    NORTH: 'EAST',
    EAST: 'SOUTH',
    SOUTH: 'WEST',
    WEST: 'NORTH',
  }
  return turns[facing]
}

/**
 * Explore cells in a direction until hitting a wall (line of sight)
 */
function exploreDirection(maze: Maze, mouse: Mouse, startPos: Position, facing: Facing): void {
  const size = maze.length
  let pos = startPos

  while (true) {
    const next = getPositionInFront(pos, facing)

    // Stop if out of bounds
    if (next.x < 0 || next.x >= size || next.y < 0 || next.y >= size) {
      break
    }

    // Add this cell to explored
    mouse.explored.add(posKey(next.x, next.y))

    // Stop if we hit a wall (can see the wall but not beyond)
    if (maze[next.y][next.x] === 'WALL') {
      break
    }

    pos = next
  }
}

/**
 * Expand the explored set to include what the mouse can currently see
 * (line of sight in front, left, and right directions)
 */
function expandExplored(maze: Maze, mouse: Mouse): void {
  const { position, facing } = mouse

  // Current position
  mouse.explored.add(posKey(position.x, position.y))

  // Front - line of sight
  exploreDirection(maze, mouse, position, facing)

  // Left - line of sight
  exploreDirection(maze, mouse, position, turnLeft(facing))

  // Right - line of sight
  exploreDirection(maze, mouse, position, turnRight(facing))
}

/**
 * Get the visible state for a player (what the mouse can see and remember)
 */
export function getMouseVision(game: Game, playerIndex: number): VisibleState {
  if (playerIndex < 0 || playerIndex >= game.players.length) {
    throw new Error('Invalid player index')
  }

  const player = game.players[playerIndex]
  const mouse = player.mouse

  // Build explored cells map
  const exploredCells = new Map<string, CellType>()
  for (const key of mouse.explored) {
    const [x, y] = key.split(',').map(Number)
    if (y >= 0 && y < game.maze.length && x >= 0 && x < game.maze[0].length) {
      exploredCells.set(key, game.maze[y][x])
    }
  }

  // Check if exit is visible
  const exitKey = posKey(game.exit.x, game.exit.y)
  const exitVisible = mouse.explored.has(exitKey)

  // Check if opponent is visible
  let opponentVisible: Position | null = null
  if (game.players.length === 2) {
    const opponentIndex = playerIndex === 0 ? 1 : 0
    const opponent = game.players[opponentIndex]
    const opponentKey = posKey(opponent.mouse.position.x, opponent.mouse.position.y)
    if (mouse.explored.has(opponentKey)) {
      opponentVisible = { ...opponent.mouse.position }
    }
  }

  return {
    position: { ...mouse.position },
    facing: mouse.facing,
    entrance: { ...game.entrance },
    exit: exitVisible ? { ...game.exit } : null,
    opponent: opponentVisible,
    exploredCells,
    actionHistory: [...mouse.actionHistory],
  }
}

/**
 * Apply a mouse action (turn + optional move)
 */
export function applyAction(game: Game, playerIndex: number, action: MouseAction): Game {
  if (playerIndex < 0 || playerIndex >= game.players.length) {
    throw new Error('Invalid player index')
  }

  const player = game.players[playerIndex]
  const mouse = player.mouse
  let newFacing = mouse.facing
  let newPosition = { ...mouse.position }

  // Apply turn first (if any)
  if (action.turn === 'LEFT') {
    newFacing = turnLeft(mouse.facing)
  } else if (action.turn === 'RIGHT') {
    newFacing = turnRight(mouse.facing)
  }

  // Apply move forward (if requested)
  if (action.move) {
    const frontPos = getPositionInFront(newPosition, newFacing)
    const size = game.maze.length

    // Check if move is valid
    const isValidMove =
      frontPos.x >= 0 &&
      frontPos.x < size &&
      frontPos.y >= 0 &&
      frontPos.y < size &&
      game.maze[frontPos.y][frontPos.x] === 'PATH'

    if (isValidMove) {
      newPosition = frontPos
    }
    // If invalid, mouse stays in place (bumps into wall)
  }

  // Create new mouse state
  const newMouse: Mouse = {
    position: newPosition,
    facing: newFacing,
    explored: new Set(mouse.explored),
    actionHistory: [...mouse.actionHistory, action],
  }

  // Expand explored area based on new position and facing
  expandExplored(game.maze, newMouse)

  // Create new player
  const newPlayer: Player = {
    ...player,
    mouse: newMouse,
  }

  // Create new players array
  const newPlayers = [...game.players]
  newPlayers[playerIndex] = newPlayer

  return {
    ...game,
    players: newPlayers,
  }
}

/**
 * Execute a turn with actions from both players
 */
export function executeTurn(game: Game, actions: [MouseAction, MouseAction]): Game {
  if (game.status !== 'PLAYING') {
    throw new Error('Game is not in playing state')
  }

  if (game.players.length !== 2) {
    throw new Error('Game does not have 2 players')
  }

  // Apply both actions (simultaneous)
  let newGame = applyAction(game, 0, actions[0])
  newGame = applyAction(newGame, 1, actions[1])

  // Increment turn
  newGame = {
    ...newGame,
    turn: newGame.turn + 1,
  }

  // Check for game end
  return checkGameEnd(newGame)
}

/**
 * Check if the game has ended and update status/result
 */
export function checkGameEnd(game: Game): Game {
  if (game.status !== 'PLAYING') {
    return game
  }

  const player1AtExit =
    game.players[0].mouse.position.x === game.exit.x &&
    game.players[0].mouse.position.y === game.exit.y

  const player2AtExit =
    game.players[1].mouse.position.x === game.exit.x &&
    game.players[1].mouse.position.y === game.exit.y

  let result: GameResult = null
  let status: GameStatus = 'PLAYING'

  // Both reach exit at same turn = draw
  if (player1AtExit && player2AtExit) {
    result = 'DRAW'
    status = 'FINISHED'
  } else if (player1AtExit) {
    result = 'PLAYER1_WIN'
    status = 'FINISHED'
  } else if (player2AtExit) {
    result = 'PLAYER2_WIN'
    status = 'FINISHED'
  } else if (game.turn >= game.maxTurns) {
    result = 'DRAW'
    status = 'FINISHED'
  }

  if (status === 'FINISHED') {
    return {
      ...game,
      status,
      result,
    }
  }

  return game
}

/**
 * Convert facing to an arrow character for display
 */
export function facingToArrow(facing: Facing): string {
  const arrows: Record<Facing, string> = {
    NORTH: '^',
    SOUTH: 'v',
    EAST: '>',
    WEST: '<',
  }
  return arrows[facing]
}

/**
 * Convert visible state to ASCII map for AI prompt
 */
export function visibleStateToAscii(state: VisibleState, mazeSize: number): string {
  const lines: string[] = []

  for (let y = 0; y < mazeSize; y++) {
    let line = ''
    for (let x = 0; x < mazeSize; x++) {
      const key = posKey(x, y)

      if (state.position.x === x && state.position.y === y) {
        line += facingToArrow(state.facing) // Show facing direction
      } else if (state.exit && state.exit.x === x && state.exit.y === y) {
        line += 'E' // Exit
      } else if (state.opponent && state.opponent.x === x && state.opponent.y === y) {
        line += 'O' // Opponent
      } else if (state.exploredCells.has(key)) {
        const cell = state.exploredCells.get(key)
        line += cell === 'WALL' ? '#' : '.'
      } else {
        line += '?' // Unexplored
      }
    }
    lines.push(line)
  }

  return lines.join('\n')
}
