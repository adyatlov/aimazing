import type { GameState } from './types'
import type { GameStatus } from './db'

export interface Game {
  id: string
  status: GameStatus
  creatorId: string
  creatorPrompt: string
  opponentId: string | null
  opponentPrompt: string | null
  state: GameState
}

export interface GameListItem {
  id: string
  status: GameStatus
  creatorName: string
  opponentName: string | null
  turn: number
  maxTurns: number
}

export interface GameStore {
  create(id: string, creatorId: string, creatorName: string, creatorPrompt: string, state: GameState): void
  get(id: string): Game | null
  join(id: string, opponentId: string, opponentName: string, opponentPrompt: string): Game
  update(id: string, state: GameState, status: GameStatus): void
  list(includeFinished: boolean): GameListItem[]
}
