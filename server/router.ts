import { os } from '@orpc/server'
import { z } from 'zod'
import { createGame, addPlayer, getMouseVision, executeTurn } from './lib/game'
import { getActions } from './lib/ai'
import type { Game } from './lib/types'
import { randomUUID } from 'crypto'

// Schemas
export const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
})

export const MouseActionSchema = z.object({
  turn: z.enum(['LEFT', 'RIGHT']).optional(),
  move: z.boolean(),
})

export const SerializedMouseSchema = z.object({
  position: PositionSchema,
  facing: z.enum(['NORTH', 'SOUTH', 'EAST', 'WEST']),
  explored: z.array(z.string()),
  actionHistory: z.array(MouseActionSchema),
})

export const SerializedPlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  prompt: z.string().optional(), // Optional - hidden from opponents
  mouse: SerializedMouseSchema,
})

export const SerializedGameSchema = z.object({
  id: z.string(),
  maze: z.array(z.array(z.enum(['WALL', 'PATH']))),
  entrance: PositionSchema,
  exit: PositionSchema,
  players: z.array(SerializedPlayerSchema),
  turn: z.number(),
  maxTurns: z.number(),
  status: z.enum(['WAITING', 'PLAYING', 'FINISHED']),
  result: z.enum(['PLAYER1_WIN', 'PLAYER2_WIN', 'DRAW']).nullable(),
})

export const GameListItemSchema = z.object({
  id: z.string(),
  status: z.enum(['WAITING', 'PLAYING', 'FINISHED']),
  playerCount: z.number(),
  playerNames: z.array(z.string()),
  turn: z.number(),
  maxTurns: z.number(),
  result: z.enum(['PLAYER1_WIN', 'PLAYER2_WIN', 'DRAW']).nullable(),
})

export type SerializedGame = z.infer<typeof SerializedGameSchema>
export type GameListItem = z.infer<typeof GameListItemSchema>

// In-memory game store
interface GameSession {
  game: Game
  id: string
  playerSecrets: Map<string, string> // playerId -> secret token
  gameSubscribers: Set<(game: SerializedGame) => void>
  isRunning: boolean
}

const games = new Map<string, GameSession>()
const gameListSubscribers = new Set<(games: GameListItem[]) => void>()

// Generate IDs
function generateGameId(): string {
  return randomUUID().substring(0, 8)
}

function generatePlayerSecret(): string {
  return randomUUID()
}

// Serialize game for a specific viewer (hides opponent prompts)
function serializeGame(game: Game, id: string, viewerPlayerId?: string): SerializedGame {
  return {
    id,
    maze: game.maze,
    entrance: game.entrance,
    exit: game.exit,
    players: game.players.map(p => ({
      id: p.id,
      name: p.name,
      // Only show prompt to the player who owns it
      prompt: viewerPlayerId === p.id ? p.prompt : undefined,
      mouse: {
        position: p.mouse.position,
        facing: p.mouse.facing,
        explored: Array.from(p.mouse.explored),
        actionHistory: p.mouse.actionHistory,
      },
    })),
    turn: game.turn,
    maxTurns: game.maxTurns,
    status: game.status,
    result: game.result,
  }
}

function serializeGameListItem(session: GameSession): GameListItem {
  return {
    id: session.id,
    status: session.game.status,
    playerCount: session.game.players.length,
    playerNames: session.game.players.map(p => p.name),
    turn: session.game.turn,
    maxTurns: session.game.maxTurns,
    result: session.game.result,
  }
}

function getGameList(): GameListItem[] {
  return Array.from(games.values()).map(serializeGameListItem)
}

function broadcastGameList() {
  const list = getGameList()
  for (const callback of gameListSubscribers) {
    try {
      callback(list)
    } catch {
      gameListSubscribers.delete(callback)
    }
  }
}

// WebSocket subscription helpers
export function subscribeToGameList(callback: (games: GameListItem[]) => void): void {
  gameListSubscribers.add(callback)
  callback(getGameList())
}

export function unsubscribeFromGameList(callback: (games: GameListItem[]) => void): void {
  gameListSubscribers.delete(callback)
}

export function subscribeToGame(gameId: string, callback: (game: SerializedGame) => void, playerSecret?: string): boolean {
  const session = games.get(gameId)
  if (!session) return false

  // Find player ID from secret
  let viewerPlayerId: string | undefined
  if (playerSecret) {
    for (const [playerId, secret] of session.playerSecrets) {
      if (secret === playerSecret) {
        viewerPlayerId = playerId
        break
      }
    }
  }

  // Wrap callback to include player filtering
  const wrappedCallback = (game: SerializedGame) => {
    callback(serializeGame(session.game, gameId, viewerPlayerId))
  }

  session.gameSubscribers.add(wrappedCallback)
  wrappedCallback(serializeGame(session.game, gameId, viewerPlayerId))
  return true
}

export function unsubscribeFromGame(gameId: string, callback: (game: SerializedGame) => void): void {
  const session = games.get(gameId)
  if (session) {
    session.gameSubscribers.delete(callback)
  }
}

// oRPC procedures
export const createGameProcedure = os
  .input(z.object({
    mazeSize: z.number().min(7).max(51).optional().default(15),
    maxTurns: z.number().min(10).max(1000).optional(),
  }))
  .output(z.object({ gameId: z.string() }))
  .handler(async ({ input }) => {
    const { mazeSize, maxTurns } = input
    const actualMaxTurns = maxTurns ?? Math.floor(mazeSize * mazeSize / 2)

    const game = createGame(mazeSize, actualMaxTurns)
    const id = generateGameId()

    games.set(id, {
      game,
      id,
      playerSecrets: new Map(),
      gameSubscribers: new Set(),
      isRunning: false,
    })

    broadcastGameList()
    return { gameId: id }
  })

export const joinGameProcedure = os
  .input(z.object({
    gameId: z.string(),
    name: z.string().min(1).max(20),
    prompt: z.string().min(1).max(500),
  }))
  .output(z.object({
    playerSecret: z.string(),
    playerId: z.string(),
    game: SerializedGameSchema,
  }))
  .handler(async ({ input }) => {
    const { gameId, name, prompt } = input
    const session = games.get(gameId)

    if (!session) {
      throw new Error('Game not found')
    }

    if (session.game.players.length >= 2) {
      throw new Error('Game already has 2 players')
    }

    if (session.game.status !== 'WAITING') {
      throw new Error('Game already started')
    }

    session.game = addPlayer(session.game, name, prompt)
    const playerId = session.game.players[session.game.players.length - 1].id
    const playerSecret = generatePlayerSecret()
    session.playerSecrets.set(playerId, playerSecret)

    broadcastGameList()
    broadcastGameUpdate(session)

    // Auto-start when 2 players joined
    if (session.game.players.length === 2 && session.game.status === 'PLAYING' && !session.isRunning) {
      session.isRunning = true
      runGameLoop(session).catch(console.error)
    }

    return {
      playerSecret,
      playerId,
      game: serializeGame(session.game, gameId, playerId),
    }
  })

export const getGameProcedure = os
  .input(z.object({
    gameId: z.string(),
    playerSecret: z.string().optional(),
  }))
  .output(SerializedGameSchema)
  .handler(async ({ input }) => {
    const session = games.get(input.gameId)

    if (!session) {
      throw new Error('Game not found')
    }

    // Find player ID from secret
    let viewerPlayerId: string | undefined
    if (input.playerSecret) {
      for (const [playerId, secret] of session.playerSecrets) {
        if (secret === input.playerSecret) {
          viewerPlayerId = playerId
          break
        }
      }
    }

    return serializeGame(session.game, input.gameId, viewerPlayerId)
  })

export const listGamesProcedure = os
  .input(z.object({
    includeFinished: z.boolean().optional().default(false),
  }))
  .output(z.array(GameListItemSchema))
  .handler(async ({ input }) => {
    let list = getGameList()
    if (!input.includeFinished) {
      list = list.filter(g => g.status !== 'FINISHED')
    }
    return list
  })

function broadcastGameUpdate(session: GameSession) {
  const game = serializeGame(session.game, session.id)
  for (const callback of session.gameSubscribers) {
    try {
      callback(game)
    } catch {
      session.gameSubscribers.delete(callback)
    }
  }
}

async function runGameLoop(session: GameSession): Promise<void> {
  const mazeSize = session.game.maze.length

  while (session.game.status === 'PLAYING') {
    const state1 = getMouseVision(session.game, 0)
    const state2 = getMouseVision(session.game, 1)

    const aiResults = await getActions(
      session.game.players[0].prompt,
      state1,
      session.game.players[1].prompt,
      state2,
      mazeSize
    )

    session.game = executeTurn(session.game, aiResults.actions)

    broadcastGameUpdate(session)
    broadcastGameList()
  }

  // Final broadcast
  broadcastGameUpdate(session)
  broadcastGameList()
  session.isRunning = false
}

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
