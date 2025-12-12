export type Position = { x: number; y: number }

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'

export type Facing = 'NORTH' | 'SOUTH' | 'EAST' | 'WEST'

export type CellType = 'WALL' | 'PATH'

export type Maze = CellType[][]

export type GameStatus = 'WAITING' | 'PLAYING' | 'FINISHED'

export type GameResult = 'PLAYER1_WIN' | 'PLAYER2_WIN' | 'DRAW' | null

/** What the mouse does in a turn */
export interface MouseAction {
  turn?: 'LEFT' | 'RIGHT'  // Optional: turn 90° left or right (only one allowed)
  move: boolean            // Whether to step forward after turning
}

export interface Mouse {
  position: Position
  facing: Facing           // Which direction the mouse is looking
  explored: Set<string>    // "x,y" format - cells the mouse has seen
  actionHistory: MouseAction[]
}

export interface Player {
  id: string
  name: string
  prompt: string
  mouse: Mouse
}

export interface Game {
  maze: Maze
  entrance: Position
  exit: Position
  players: Player[]
  turn: number
  maxTurns: number
  status: GameStatus
  result: GameResult
}

/** What the mouse can see from its current position */
export interface MouseVision {
  position: Position
  facing: Facing
  front: CellType | 'EXIT' | 'UNKNOWN'  // What's directly ahead
  left: CellType | 'EXIT' | 'UNKNOWN'   // What's to the left
  right: CellType | 'EXIT' | 'UNKNOWN'  // What's to the right
  exitVisible: Position | null          // Exit position if in explored area
  opponentVisible: Position | null      // Opponent if in explored area
  exploredMap: string                   // ASCII representation of memory
}

export interface VisibleState {
  position: Position
  facing: Facing
  entrance: Position           // Start position (always known)
  exit: Position | null        // Exit position (only if visible)
  opponent: Position | null
  exploredCells: Map<string, CellType>
  actionHistory: MouseAction[]
}
