import type { GameState, SerializedGameState, Mouse } from './types'
import type { GameStore, Game, GameListItem } from './gameStore'
import { createGame as createGameDb, updateGameDb, getGame as getGameDb, getAllGames, type GameStatus, type DbGame } from './db'

function serializeState(state: GameState): string {
  const serialized: SerializedGameState = {
    ...state,
    mice: state.mice.map(m => ({
      ...m,
      explored: Array.from(m.explored),
    })),
  }
  return JSON.stringify(serialized)
}

function deserializeState(json: string): GameState {
  const parsed: SerializedGameState = JSON.parse(json)
  return {
    ...parsed,
    mice: parsed.mice.map(m => ({
      ...m,
      explored: new Set(m.explored),
    })),
  }
}

function dbToGame(db: DbGame): Game {
  return {
    id: db.id,
    status: db.status,
    creatorId: db.creator_id,
    creatorPrompt: db.creator_prompt,
    opponentId: db.opponent_id,
    opponentPrompt: db.opponent_prompt,
    state: deserializeState(db.game_state),
  }
}

class SqliteGameStore implements GameStore {
  private cache = new Map<string, Game>()

  create(id: string, creatorId: string, creatorName: string, creatorPrompt: string, state: GameState): void {
    // Add creator's mouse
    state.mice = [{
      name: creatorName,
      position: { ...state.entrance },
      facing: 'SOUTH',
      explored: new Set([`${state.entrance.x},${state.entrance.y}`]),
      actionHistory: [],
    }]

    createGameDb(id, creatorId, creatorPrompt, serializeState(state))

    this.cache.set(id, {
      id,
      status: 'WAITING',
      creatorId,
      creatorPrompt,
      opponentId: null,
      opponentPrompt: null,
      state,
    })
  }

  get(id: string): Game | null {
    if (this.cache.has(id)) {
      return this.cache.get(id)!
    }

    const db = getGameDb(id)
    if (!db) return null

    const game = dbToGame(db)
    this.cache.set(id, game)
    return game
  }

  join(id: string, opponentId: string, opponentName: string, opponentPrompt: string): Game {
    const game = this.get(id)
    if (!game) throw new Error('Game not found')
    if (game.status !== 'WAITING') throw new Error('Game not waiting for opponent')
    if (game.opponentId) throw new Error('Game already has opponent')

    // Add opponent's mouse
    game.state.mice.push({
      name: opponentName,
      position: { ...game.state.entrance },
      facing: 'SOUTH',
      explored: new Set([`${game.state.entrance.x},${game.state.entrance.y}`]),
      actionHistory: [],
    })

    game.opponentId = opponentId
    game.opponentPrompt = opponentPrompt
    game.status = 'PLAYING'

    updateGameDb(id, game.status, opponentId, opponentPrompt, serializeState(game.state))
    return game
  }

  update(id: string, state: GameState, status: GameStatus): void {
    const game = this.cache.get(id)
    if (!game) return

    game.state = state
    game.status = status

    updateGameDb(id, status, game.opponentId, game.opponentPrompt, serializeState(state))
  }

  list(includeFinished: boolean): GameListItem[] {
    const all = getAllGames()
    return all
      .filter(db => includeFinished || db.status === 'WAITING' || db.status === 'PLAYING')
      .map(db => {
        const state = deserializeState(db.game_state)
        return {
          id: db.id,
          status: db.status,
          creatorName: state.mice[0]?.name ?? 'Unknown',
          opponentName: state.mice[1]?.name ?? null,
          turn: state.turn,
          maxTurns: state.maxTurns,
        }
      })
  }
}

export const gameStore = new SqliteGameStore()
