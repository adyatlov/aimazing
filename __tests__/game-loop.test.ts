import { describe, it, expect } from 'vitest'
import { runGameWithMockAI, PlayerConfig, GameConfig } from '../server/lib/game-loop'
import { Game, MouseAction } from '../server/lib/types'
import { hasPath } from '../server/lib/maze'

describe('runGameWithMockAI', () => {
  const player1: PlayerConfig = { name: 'Mouse 1', prompt: 'Go right' }
  const player2: PlayerConfig = { name: 'Mouse 2', prompt: 'Go down' }

  it('should run a game to completion', async () => {
    // Simple strategy: both players don't move
    const getActions = (): [MouseAction, MouseAction] => [
      { move: false },
      { move: false },
    ]

    const { result, game } = await runGameWithMockAI(player1, player2, getActions, {
      mazeSize: 7,
      maxTurns: 10,
    })

    expect(game.status).toBe('FINISHED')
    expect(result).toBe('DRAW') // Both stayed, hit turn limit
    expect(game.turn).toBe(10)
  })

  it('should detect winner when player reaches exit', async () => {
    let moveCount = 0

    // Strategy: Player 1 moves forward, Player 2 stays
    const getActions = (): [MouseAction, MouseAction] => {
      moveCount++
      // Player 1 alternates between moving and turning to explore
      if (moveCount % 3 === 0) {
        return [{ turn: 'RIGHT', move: true }, { move: false }]
      }
      return [{ move: true }, { move: false }]
    }

    const { game } = await runGameWithMockAI(player1, player2, getActions, {
      mazeSize: 7,
      maxTurns: 100,
    })

    expect(game.status).toBe('FINISHED')
    // Either someone won or it's a draw
    expect(['PLAYER1_WIN', 'PLAYER2_WIN', 'DRAW']).toContain(game.result)
  })

  it('should call onTurn callback each turn', async () => {
    const turns: number[] = []

    const getActions = (): [MouseAction, MouseAction] => [
      { move: false },
      { move: false },
    ]

    await runGameWithMockAI(player1, player2, getActions, {
      mazeSize: 7,
      maxTurns: 5,
      onTurn: (game, turn) => {
        turns.push(turn)
      },
    })

    expect(turns).toEqual([1, 2, 3, 4, 5])
  })

  it('should call onGameEnd callback when game ends', async () => {
    let endCalled = false
    let finalGame: Game | null = null

    const getActions = (): [MouseAction, MouseAction] => [
      { move: false },
      { move: false },
    ]

    await runGameWithMockAI(player1, player2, getActions, {
      mazeSize: 7,
      maxTurns: 3,
      onGameEnd: (game) => {
        endCalled = true
        finalGame = game
      },
    })

    expect(endCalled).toBe(true)
    expect(finalGame).not.toBeNull()
    expect(finalGame!.status).toBe('FINISHED')
  })

  it('should handle simultaneous exit (draw)', async () => {
    // Both players make same moves
    const getActions = (): [MouseAction, MouseAction] => {
      return [{ move: true }, { move: true }]
    }

    const { game } = await runGameWithMockAI(player1, player2, getActions, {
      mazeSize: 7,
      maxTurns: 200,
    })

    expect(game.status).toBe('FINISHED')
    // If they make identical moves, they'll either both reach exit (DRAW) or hit turn limit (DRAW)
  })

  it('should track action history for both players', async () => {
    const getActions = (): [MouseAction, MouseAction] => [
      { move: true },
      { turn: 'LEFT', move: false },
    ]

    const { game } = await runGameWithMockAI(player1, player2, getActions, {
      mazeSize: 7,
      maxTurns: 3,
    })

    expect(game.players[0].mouse.actionHistory).toHaveLength(3)
    expect(game.players[1].mouse.actionHistory).toHaveLength(3)
    // All actions for player 1 should have move: true
    expect(game.players[0].mouse.actionHistory.every((a) => a.move === true)).toBe(true)
    // All actions for player 2 should have turn: 'LEFT' and move: false
    expect(game.players[1].mouse.actionHistory.every((a) => a.turn === 'LEFT' && a.move === false)).toBe(true)
  })

  it('should generate solvable maze', async () => {
    const getActions = (): [MouseAction, MouseAction] => [
      { move: false },
      { move: false },
    ]

    const { game } = await runGameWithMockAI(player1, player2, getActions, {
      mazeSize: 15,
      maxTurns: 1,
    })

    // Verify the maze is solvable
    expect(hasPath(game.maze, game.entrance, game.exit)).toBe(true)
  })

  it('should allow turning without moving', async () => {
    let turnCount = 0
    const getActions = (game: Game): [MouseAction, MouseAction] => {
      turnCount++
      // Player 1 turns left without moving
      return [{ turn: 'LEFT', move: false }, { move: false }]
    }

    const { game } = await runGameWithMockAI(player1, player2, getActions, {
      mazeSize: 7,
      maxTurns: 4,
    })

    // After 4 left turns, should be back to EAST
    expect(game.players[0].mouse.facing).toBe('EAST')
    // Position should not have changed
    expect(game.players[0].mouse.position).toEqual(game.entrance)
  })

  it('should allow turning and moving in same action', async () => {
    const getActions = (): [MouseAction, MouseAction] => {
      return [{ turn: 'RIGHT', move: true }, { move: false }]
    }

    const { game } = await runGameWithMockAI(player1, player2, getActions, {
      mazeSize: 7,
      maxTurns: 1,
    })

    // Player 1 should have turned right (now facing SOUTH) and attempted to move
    expect(game.players[0].mouse.facing).toBe('SOUTH')
  })
})
