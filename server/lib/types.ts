export type Position = { x: number; y: number }
export type Facing = 'NORTH' | 'SOUTH' | 'EAST' | 'WEST'
export type CellType = 'WALL' | 'PATH'
export type Maze = CellType[][]

export interface MouseAction {
  turn?: 'LEFT' | 'RIGHT'
  move: boolean
}

export interface Mouse {
  name: string
  position: Position
  facing: Facing
  explored: Set<string>
  actionHistory: MouseAction[]
}

// What gets stored as JSON in game_state column
export interface GameState {
  maze: Maze
  entrance: Position
  exit: Position
  maxTurns: number
  turn: number
  mice: Mouse[]
}

// For serialization (Set -> Array)
export interface SerializedMouse {
  name: string
  position: Position
  facing: Facing
  explored: string[]
  actionHistory: MouseAction[]
}

export interface SerializedGameState {
  maze: Maze
  entrance: Position
  exit: Position
  maxTurns: number
  turn: number
  mice: SerializedMouse[]
}

// What the mouse can see
export interface MouseVision {
  position: Position
  facing: Facing
  front: CellType | 'EXIT' | 'UNKNOWN'
  left: CellType | 'EXIT' | 'UNKNOWN'
  right: CellType | 'EXIT' | 'UNKNOWN'
  exitVisible: Position | null
  opponentVisible: Position | null
  exploredMap: string
}
