import { Game, GameResult, MouseAction, VisibleState } from './types'
import { createGame, addPlayer, getMouseVision, executeTurn, facingToArrow } from './game'
import { getActions, ActionsResult, ActionResult } from './ai'
import { mazeToAscii } from './maze'

export interface TurnInfo {
  actions: [MouseAction, MouseAction]
  states: [VisibleState, VisibleState]
  aiResults: ActionsResult
}

function createMockTurnInfo(
  actions: [MouseAction, MouseAction],
  states: [VisibleState, VisibleState]
): TurnInfo {
  const mockResult: ActionResult = { action: { move: false }, toolCalls: [] }
  return {
    actions,
    states,
    aiResults: {
      actions,
      results: [
        { ...mockResult, action: actions[0] },
        { ...mockResult, action: actions[1] },
      ],
    },
  }
}

export interface GameConfig {
  mazeSize?: number
  maxTurns?: number
  onTurn?: (game: Game, turn: number, info: TurnInfo) => void | Promise<void>
  onGameEnd?: (game: Game) => void
}

export interface PlayerConfig {
  name: string
  prompt: string
}

const DEFAULT_CONFIG: Required<Omit<GameConfig, 'onTurn' | 'onGameEnd'>> = {
  mazeSize: 15,
  maxTurns: 200,
}

/**
 * Run a complete game from start to finish
 */
export async function runGame(
  player1: PlayerConfig,
  player2: PlayerConfig,
  config: GameConfig = {}
): Promise<{ result: GameResult; game: Game }> {
  const { mazeSize, maxTurns } = { ...DEFAULT_CONFIG, ...config }
  const { onTurn, onGameEnd } = config

  // Create game and add players
  let game = createGame(mazeSize, maxTurns)
  game = addPlayer(game, player1.name, player1.prompt)
  game = addPlayer(game, player2.name, player2.prompt)

  // Game loop
  while (game.status === 'PLAYING') {
    // Get visible states for both players
    const state1 = getMouseVision(game, 0)
    const state2 = getMouseVision(game, 1)

    // Get AI actions for both players
    const aiResults = await getActions(
      player1.prompt,
      state1,
      player2.prompt,
      state2,
      mazeSize
    )

    // Execute turn
    game = executeTurn(game, aiResults.actions)

    // Callback (supports async)
    if (onTurn) {
      await onTurn(game, game.turn, {
        actions: aiResults.actions,
        states: [state1, state2],
        aiResults,
      })
    }
  }

  // Game ended
  if (onGameEnd) {
    onGameEnd(game)
  }

  return { result: game.result, game }
}

/**
 * Run a game with mock AI (for testing without API calls)
 */
export async function runGameWithMockAI(
  player1: PlayerConfig,
  player2: PlayerConfig,
  getMockActions: (game: Game, turn: number) => [MouseAction, MouseAction],
  config: GameConfig = {}
): Promise<{ result: GameResult; game: Game }> {
  const { mazeSize, maxTurns } = { ...DEFAULT_CONFIG, ...config }
  const { onTurn, onGameEnd } = config

  // Create game and add players
  let game = createGame(mazeSize, maxTurns)
  game = addPlayer(game, player1.name, player1.prompt)
  game = addPlayer(game, player2.name, player2.prompt)

  // Game loop
  while (game.status === 'PLAYING') {
    // Get visible states before actions
    const state1 = getMouseVision(game, 0)
    const state2 = getMouseVision(game, 1)

    // Get mock actions
    const actions = getMockActions(game, game.turn)

    // Execute turn
    game = executeTurn(game, actions)

    // Callback with TurnInfo
    if (onTurn) {
      const turnInfo = createMockTurnInfo(actions, [state1, state2])
      onTurn(game, game.turn, turnInfo)
    }
  }

  // Game ended
  if (onGameEnd) {
    onGameEnd(game)
  }

  return { result: game.result, game }
}

/**
 * Format an action for display
 */
function formatAction(action: MouseAction): string {
  const parts: string[] = []
  if (action.turn) {
    parts.push(`turn ${action.turn.toLowerCase()}`)
  }
  if (action.move) {
    parts.push('move forward')
  }
  if (parts.length === 0) {
    parts.push('(no action)')
  }
  return parts.join(', ')
}

/**
 * Print game state to console (for debugging)
 */
export function printGameState(game: Game): void {
  const write = (s: string) => process.stdout.write(s + '\n')
  write('\n=== Game State ===')
  write(`Turn: ${game.turn}/${game.maxTurns}`)
  write(`Status: ${game.status}`)
  write(`Result: ${game.result ?? 'ongoing'}`)
  write('\nPlayers:')
  game.players.forEach((p, i) => {
    const arrow = facingToArrow(p.mouse.facing)
    write(`  ${i + 1}. ${p.name}: (${p.mouse.position.x}, ${p.mouse.position.y}) facing ${p.mouse.facing} ${arrow}`)
  })
  write('\nMaze:')
  // Show mice with their facing arrows
  const mazeStr = game.maze
    .map((row, y) =>
      row
        .map((cell, x) => {
          if (game.entrance.x === x && game.entrance.y === y) {
            // Check if a mouse is here
            for (const p of game.players) {
              if (p.mouse.position.x === x && p.mouse.position.y === y) {
                return facingToArrow(p.mouse.facing)
              }
            }
            return 'S'
          }
          if (game.exit.x === x && game.exit.y === y) {
            // Check if a mouse is here
            for (const p of game.players) {
              if (p.mouse.position.x === x && p.mouse.position.y === y) {
                return facingToArrow(p.mouse.facing)
              }
            }
            return 'E'
          }
          // Check for mice
          for (let i = 0; i < game.players.length; i++) {
            const p = game.players[i]
            if (p.mouse.position.x === x && p.mouse.position.y === y) {
              return facingToArrow(p.mouse.facing)
            }
          }
          return cell === 'WALL' ? '#' : '.'
        })
        .join('')
    )
    .join('\n')
  write(mazeStr)
  write('')
}

export { formatAction }
