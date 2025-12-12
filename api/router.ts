import { os } from '@orpc/server'
import { z } from 'zod'
import { createGame, addPlayer, getMouseVision, executeTurn, facingToArrow } from '../lib/game'
import { getActions } from '../lib/ai'
import type { Game, GameResult, GameStatus, MouseAction, Position, Facing, CellType } from '../lib/types'

// Serializable game state (Maps and Sets converted to arrays/objects)
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
  prompt: z.string(),
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

export const TurnUpdateSchema = z.object({
  turn: z.number(),
  game: SerializedGameSchema,
  actions: z.tuple([MouseActionSchema, MouseActionSchema]),
  toolCalls: z.tuple([z.array(z.string()), z.array(z.string())]),
})

export type SerializedGame = z.infer<typeof SerializedGameSchema>
export type TurnUpdate = z.infer<typeof TurnUpdateSchema>

// In-memory game store
interface GameSession {
  game: Game
  id: string
  subscribers: Set<(update: TurnUpdate) => void>
  isRunning: boolean
}

const games = new Map<string, GameSession>()

function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

function serializeGame(game: Game, id: string): SerializedGame {
  return {
    id,
    maze: game.maze,
    entrance: game.entrance,
    exit: game.exit,
    players: game.players.map(p => ({
      id: p.id,
      name: p.name,
      prompt: p.prompt,
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

// oRPC procedures
export const createGameProcedure = os
  .input(z.object({
    mazeSize: z.number().min(7).max(51).optional().default(15),
    maxTurns: z.number().min(10).max(1000).optional(),
  }))
  .output(SerializedGameSchema)
  .handler(async ({ input }) => {
    const { mazeSize, maxTurns } = input
    const actualMaxTurns = maxTurns ?? Math.floor(mazeSize * mazeSize / 2)

    const game = createGame(mazeSize, actualMaxTurns)
    const id = generateId()

    games.set(id, {
      game,
      id,
      subscribers: new Set(),
      isRunning: false,
    })

    return serializeGame(game, id)
  })

export const joinGameProcedure = os
  .input(z.object({
    gameId: z.string(),
    name: z.string(),
    prompt: z.string(),
  }))
  .output(SerializedGameSchema)
  .handler(async ({ input }) => {
    const { gameId, name, prompt } = input
    const session = games.get(gameId)

    if (!session) {
      throw new Error('Game not found')
    }

    if (session.game.players.length >= 2) {
      throw new Error('Game already has 2 players')
    }

    session.game = addPlayer(session.game, name, prompt)

    return serializeGame(session.game, gameId)
  })

export const getGameProcedure = os
  .input(z.object({
    gameId: z.string(),
  }))
  .output(SerializedGameSchema)
  .handler(async ({ input }) => {
    const session = games.get(input.gameId)

    if (!session) {
      throw new Error('Game not found')
    }

    return serializeGame(session.game, input.gameId)
  })

export const startGameProcedure = os
  .input(z.object({
    gameId: z.string(),
  }))
  .output(z.object({ started: z.boolean() }))
  .handler(async ({ input }) => {
    const session = games.get(input.gameId)

    if (!session) {
      throw new Error('Game not found')
    }

    if (session.game.status !== 'PLAYING') {
      throw new Error('Game is not ready to start (need 2 players)')
    }

    if (session.isRunning) {
      return { started: false }
    }

    session.isRunning = true

    // Run game loop in background
    runGameLoop(session).catch(console.error)

    return { started: true }
  })

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

    const update: TurnUpdate = {
      turn: session.game.turn,
      game: serializeGame(session.game, session.id),
      actions: aiResults.actions,
      toolCalls: [aiResults.results[0].toolCalls, aiResults.results[1].toolCalls],
    }

    // Notify all subscribers
    for (const callback of session.subscribers) {
      try {
        callback(update)
      } catch (e) {
        // Remove failed subscriber
        session.subscribers.delete(callback)
      }
    }
  }

  session.isRunning = false
}

// Streaming subscription for game updates
export const watchGameProcedure = os
  .input(z.object({
    gameId: z.string(),
  }))
  .handler(async function* ({ input, signal }) {
    const session = games.get(input.gameId)

    if (!session) {
      throw new Error('Game not found')
    }

    // Send current state first
    yield serializeGame(session.game, input.gameId)

    // Create a queue for updates
    const updates: TurnUpdate[] = []
    let resolve: (() => void) | null = null

    const callback = (update: TurnUpdate) => {
      updates.push(update)
      if (resolve) {
        resolve()
        resolve = null
      }
    }

    session.subscribers.add(callback)

    try {
      while (!signal?.aborted && session.game.status !== 'FINISHED') {
        if (updates.length === 0) {
          // Wait for next update
          await new Promise<void>(r => { resolve = r })
        }

        while (updates.length > 0) {
          const update = updates.shift()!
          yield update.game
        }
      }

      // Send final state
      yield serializeGame(session.game, input.gameId)
    } finally {
      session.subscribers.delete(callback)
    }
  })

export const listGamesProcedure = os
  .output(z.array(SerializedGameSchema))
  .handler(async () => {
    return Array.from(games.entries()).map(([id, session]) =>
      serializeGame(session.game, id)
    )
  })

// Router
export const router = {
  game: {
    create: createGameProcedure,
    join: joinGameProcedure,
    get: getGameProcedure,
    start: startGameProcedure,
    watch: watchGameProcedure,
    list: listGamesProcedure,
  },
}

export type Router = typeof router
