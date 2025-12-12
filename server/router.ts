import { os } from '@orpc/server'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { gameStore } from './lib/sqliteGameStore'
import { createGameState, getMouseVision, executeTurn } from './lib/game'
import { getActions } from './lib/ai'
import type { Game, GameListItem } from './lib/gameStore'
import type { GameStatus } from './lib/db'

// Schemas
const PositionSchema = z.object({ x: z.number(), y: z.number() })
const MouseSchema = z.object({
  name: z.string(),
  position: PositionSchema,
  facing: z.enum(['NORTH', 'SOUTH', 'EAST', 'WEST']),
  explored: z.array(z.string()),
  actionHistory: z.array(z.object({ turn: z.enum(['LEFT', 'RIGHT']).optional(), move: z.boolean() })),
})

const GameResponseSchema = z.object({
  id: z.string(),
  status: z.enum(['WAITING', 'PLAYING', 'CREATOR_WIN', 'OPPONENT_WIN', 'DRAW']),
  maze: z.array(z.array(z.enum(['WALL', 'PATH']))),
  entrance: PositionSchema,
  exit: PositionSchema,
  turn: z.number(),
  maxTurns: z.number(),
  mice: z.array(MouseSchema),
  myPrompt: z.string().optional(),
})

const GameListItemSchema = z.object({
  id: z.string(),
  status: z.enum(['WAITING', 'PLAYING', 'CREATOR_WIN', 'OPPONENT_WIN', 'DRAW']),
  creatorName: z.string(),
  opponentName: z.string().nullable(),
  turn: z.number(),
  maxTurns: z.number(),
})

export type GameResponse = z.infer<typeof GameResponseSchema>

// Helpers
function generateId(): string {
  return randomUUID().substring(0, 8)
}

function gameToResponse(game: Game, viewerPlayerId?: string): GameResponse {
  const isCreator = viewerPlayerId === game.creatorId
  const isOpponent = viewerPlayerId === game.opponentId
  const myPrompt = isCreator ? game.creatorPrompt : isOpponent ? game.opponentPrompt : undefined

  return {
    id: game.id,
    status: game.status,
    maze: game.state.maze,
    entrance: game.state.entrance,
    exit: game.state.exit,
    turn: game.state.turn,
    maxTurns: game.state.maxTurns,
    mice: game.state.mice.map(m => ({
      ...m,
      explored: Array.from(m.explored),
    })),
    myPrompt: myPrompt ?? undefined,
  }
}

// Runtime state for WebSocket subscriptions
const gameSubscribers = new Map<string, Set<(game: GameResponse) => void>>()
const listSubscribers = new Map<(list: GameListItem[]) => void, string>() // callback -> userId
const runningGames = new Set<string>()

function broadcastGame(gameId: string) {
  const subs = gameSubscribers.get(gameId)
  if (!subs) return
  const game = gameStore.get(gameId)
  if (!game) return
  for (const cb of subs) {
    try { cb(gameToResponse(game)) } catch { subs.delete(cb) }
  }
}

function broadcastList() {
  for (const [cb, userId] of listSubscribers) {
    try {
      const list = gameStore.list(userId, false)
      cb(list)
    } catch {
      listSubscribers.delete(cb)
    }
  }
}

export function subscribeToGame(gameId: string, callback: (game: GameResponse) => void, playerId?: string): boolean {
  const game = gameStore.get(gameId)
  if (!game) return false

  let subs = gameSubscribers.get(gameId)
  if (!subs) {
    subs = new Set()
    gameSubscribers.set(gameId, subs)
  }

  const wrappedCallback = () => {
    const g = gameStore.get(gameId)
    if (g) callback(gameToResponse(g, playerId))
  }
  subs.add(wrappedCallback)
  wrappedCallback()
  return true
}

export function unsubscribeFromGame(gameId: string, callback: (game: GameResponse) => void): void {
  gameSubscribers.get(gameId)?.delete(callback)
}

export function subscribeToGameList(userId: string, callback: (list: GameListItem[]) => void): void {
  listSubscribers.set(callback, userId)
  callback(gameStore.list(userId, false))
}

export function unsubscribeFromGameList(callback: (list: GameListItem[]) => void): void {
  listSubscribers.delete(callback)
}

// Game loop
async function runGameLoop(gameId: string): Promise<void> {
  const game = gameStore.get(gameId)
  if (!game || game.status !== 'PLAYING') return

  while (game.status === 'PLAYING') {
    const vision1 = getMouseVision(game.state, 0)
    const vision2 = getMouseVision(game.state, 1)

    const { actions } = await getActions(
      game.creatorPrompt,
      vision1,
      game.opponentPrompt!,
      vision2,
      game.state.maze.length
    )

    const { state, status } = executeTurn(game.state, actions)
    gameStore.update(gameId, state, status)
    game.state = state
    game.status = status

    broadcastGame(gameId)
    broadcastList()
  }

  runningGames.delete(gameId)
}

// API Procedures
export const createGameProcedure = os
  .input(z.object({
    userId: z.string(),
    mazeSize: z.number().min(7).max(51).default(15),
    maxTurns: z.number().min(10).max(1000).optional(),
    name: z.string().min(1).max(20),
    prompt: z.string().min(1).max(500),
  }))
  .output(z.object({ gameId: z.string() }))
  .handler(async ({ input }) => {
    const gameId = generateId()
    const state = createGameState(input.mazeSize, input.maxTurns)

    gameStore.create(gameId, input.userId, input.name, input.prompt, state)
    broadcastList()

    return { gameId }
  })

export const joinGameProcedure = os
  .input(z.object({
    gameId: z.string(),
    userId: z.string(),
    name: z.string().min(1).max(20),
    prompt: z.string().min(1).max(500),
  }))
  .output(z.object({ game: GameResponseSchema }))
  .handler(async ({ input }) => {
    const game = gameStore.join(input.gameId, input.userId, input.name, input.prompt)

    broadcastGame(input.gameId)
    broadcastList()

    // Auto-start game loop
    if (game.status === 'PLAYING' && !runningGames.has(input.gameId)) {
      runningGames.add(input.gameId)
      runGameLoop(input.gameId).catch(console.error)
    }

    return { game: gameToResponse(game, input.userId) }
  })

export const getGameProcedure = os
  .input(z.object({
    gameId: z.string(),
    playerId: z.string().optional(),
  }))
  .output(GameResponseSchema)
  .handler(async ({ input }) => {
    const game = gameStore.get(input.gameId)
    if (!game) throw new Error('Game not found')
    return gameToResponse(game, input.playerId)
  })

export const listGamesProcedure = os
  .input(z.object({
    userId: z.string(),
    includeFinished: z.boolean().default(false),
  }))
  .output(z.array(GameListItemSchema))
  .handler(async ({ input }) => {
    return gameStore.list(input.userId, input.includeFinished)
  })

// Router
export const router = {
  game: {
    create: createGameProcedure,
    join: joinGameProcedure,
    get: getGameProcedure,
    list: listGamesProcedure,
  },
}

export type Router = typeof router
export type { GameListItem }
