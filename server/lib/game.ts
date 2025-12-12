import type { GameState, Mouse, Maze, Position, Facing, CellType, MouseAction, MouseVision } from './types'
import type { GameStatus } from './db'
import { generateMaze } from './maze'

function posKey(x: number, y: number): string {
  return `${x},${y}`
}

export interface MazePreview {
  maze: Maze
  entrance: Position
  exit: Position
}

export function createMazePreview(mazeSize: number): MazePreview {
  return generateMaze(mazeSize)
}

export function createGameState(mazeSize: number, maxTurns?: number, existingMaze?: MazePreview): GameState {
  const { maze, entrance, exit } = existingMaze ?? generateMaze(mazeSize)
  return {
    maze,
    entrance,
    exit,
    maxTurns: maxTurns ?? Math.floor(mazeSize * mazeSize / 2),
    turn: 0,
    mice: [],
  }
}

export function getPositionInFront(pos: Position, facing: Facing): Position {
  switch (facing) {
    case 'NORTH': return { x: pos.x, y: pos.y - 1 }
    case 'SOUTH': return { x: pos.x, y: pos.y + 1 }
    case 'EAST': return { x: pos.x + 1, y: pos.y }
    case 'WEST': return { x: pos.x - 1, y: pos.y }
  }
}

export function turnLeft(facing: Facing): Facing {
  const turns: Record<Facing, Facing> = { NORTH: 'WEST', WEST: 'SOUTH', SOUTH: 'EAST', EAST: 'NORTH' }
  return turns[facing]
}

export function turnRight(facing: Facing): Facing {
  const turns: Record<Facing, Facing> = { NORTH: 'EAST', EAST: 'SOUTH', SOUTH: 'WEST', WEST: 'NORTH' }
  return turns[facing]
}

function exploreDirection(maze: Maze, mouse: Mouse, startPos: Position, facing: Facing): void {
  const size = maze.length
  let pos = startPos

  while (true) {
    const next = getPositionInFront(pos, facing)
    if (next.x < 0 || next.x >= size || next.y < 0 || next.y >= size) break
    mouse.explored.add(posKey(next.x, next.y))
    if (maze[next.y][next.x] === 'WALL') break
    pos = next
  }
}

function expandExplored(maze: Maze, mouse: Mouse): void {
  mouse.explored.add(posKey(mouse.position.x, mouse.position.y))
  exploreDirection(maze, mouse, mouse.position, mouse.facing)
  exploreDirection(maze, mouse, mouse.position, turnLeft(mouse.facing))
  exploreDirection(maze, mouse, mouse.position, turnRight(mouse.facing))
}

export function getMouseVision(state: GameState, mouseIndex: number): MouseVision {
  const mouse = state.mice[mouseIndex]
  if (!mouse) throw new Error('Invalid mouse index')

  const exploredCells = new Map<string, CellType>()
  for (const key of mouse.explored) {
    const [x, y] = key.split(',').map(Number)
    if (y >= 0 && y < state.maze.length && x >= 0 && x < state.maze[0].length) {
      exploredCells.set(key, state.maze[y][x])
    }
  }

  const exitKey = posKey(state.exit.x, state.exit.y)
  const exitVisible = mouse.explored.has(exitKey)

  let opponentVisible: Position | null = null
  if (state.mice.length === 2) {
    const opponent = state.mice[mouseIndex === 0 ? 1 : 0]
    if (mouse.explored.has(posKey(opponent.position.x, opponent.position.y))) {
      opponentVisible = { ...opponent.position }
    }
  }

  // Determine what's in each direction
  const getCell = (pos: Position): CellType | 'EXIT' | 'UNKNOWN' => {
    if (pos.x === state.exit.x && pos.y === state.exit.y) return 'EXIT'
    const key = posKey(pos.x, pos.y)
    if (!mouse.explored.has(key)) return 'UNKNOWN'
    return exploredCells.get(key) ?? 'UNKNOWN'
  }

  return {
    position: { ...mouse.position },
    facing: mouse.facing,
    front: getCell(getPositionInFront(mouse.position, mouse.facing)),
    left: getCell(getPositionInFront(mouse.position, turnLeft(mouse.facing))),
    right: getCell(getPositionInFront(mouse.position, turnRight(mouse.facing))),
    exitVisible: exitVisible ? { ...state.exit } : null,
    opponentVisible,
    exploredMap: visibleStateToAscii(mouse, exploredCells, state),
  }
}

function visibleStateToAscii(mouse: Mouse, exploredCells: Map<string, CellType>, state: GameState): string {
  const size = state.maze.length
  const lines: string[] = []

  for (let y = 0; y < size; y++) {
    let line = ''
    for (let x = 0; x < size; x++) {
      const key = posKey(x, y)
      if (mouse.position.x === x && mouse.position.y === y) {
        line += { NORTH: '^', SOUTH: 'v', EAST: '>', WEST: '<' }[mouse.facing]
      } else if (state.exit.x === x && state.exit.y === y && mouse.explored.has(key)) {
        line += 'E'
      } else if (exploredCells.has(key)) {
        line += exploredCells.get(key) === 'WALL' ? '#' : '.'
      } else {
        line += '?'
      }
    }
    lines.push(line)
  }

  return lines.join('\n')
}

export function applyAction(state: GameState, mouseIndex: number, action: MouseAction): GameState {
  const mouse = state.mice[mouseIndex]
  if (!mouse) throw new Error('Invalid mouse index')

  let newFacing = mouse.facing
  let newPosition = { ...mouse.position }

  if (action.turn === 'LEFT') newFacing = turnLeft(mouse.facing)
  else if (action.turn === 'RIGHT') newFacing = turnRight(mouse.facing)

  if (action.move) {
    const frontPos = getPositionInFront(newPosition, newFacing)
    const size = state.maze.length
    const isValid = frontPos.x >= 0 && frontPos.x < size && frontPos.y >= 0 && frontPos.y < size && state.maze[frontPos.y][frontPos.x] === 'PATH'
    if (isValid) newPosition = frontPos
  }

  const newMouse: Mouse = {
    ...mouse,
    position: newPosition,
    facing: newFacing,
    explored: new Set(mouse.explored),
    actionHistory: [...mouse.actionHistory, action],
  }
  expandExplored(state.maze, newMouse)

  const newMice = [...state.mice]
  newMice[mouseIndex] = newMouse

  return { ...state, mice: newMice }
}

export function executeTurn(state: GameState, actions: [MouseAction, MouseAction]): { state: GameState; status: GameStatus } {
  if (state.mice.length !== 2) throw new Error('Need 2 mice')

  let newState = applyAction(state, 0, actions[0])
  newState = applyAction(newState, 1, actions[1])
  newState = { ...newState, turn: newState.turn + 1 }

  const mouse1AtExit = newState.mice[0].position.x === newState.exit.x && newState.mice[0].position.y === newState.exit.y
  const mouse2AtExit = newState.mice[1].position.x === newState.exit.x && newState.mice[1].position.y === newState.exit.y

  let status: GameStatus = 'PLAYING'
  if (mouse1AtExit && mouse2AtExit) status = 'DRAW'
  else if (mouse1AtExit) status = 'CREATOR_WIN'
  else if (mouse2AtExit) status = 'OPPONENT_WIN'
  else if (newState.turn >= newState.maxTurns) status = 'DRAW'

  return { state: newState, status }
}
