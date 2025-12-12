#!/usr/bin/env npx tsx

import 'dotenv/config'
import logUpdate from 'log-update'
import { runGame, formatAction, TurnInfo } from './lib/game-loop'
import { Game } from './lib/types'
import { facingToArrow } from './lib/game'
import { buildMemoryMap, formatVision, buildVisionResult } from './lib/ai'

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function renderFullMaze(game: Game): string {
  return game.maze
    .map((row, y) =>
      row
        .map((cell, x) => {
          // Check for mice first
          for (const p of game.players) {
            if (p.mouse.position.x === x && p.mouse.position.y === y) {
              return facingToArrow(p.mouse.facing)
            }
          }
          if (game.entrance.x === x && game.entrance.y === y) return 'S'
          if (game.exit.x === x && game.exit.y === y) return 'E'
          return cell === 'WALL' ? '#' : '.'
        })
        .join('')
    )
    .join('\n')
}

function renderGameState(game: Game, maxTurns: number, info: TurnInfo, mazeSize: number): string {
  const lines: string[] = []

  lines.push(`Turn: ${game.turn}/${maxTurns}`)
  lines.push('')

  // Full maze
  lines.push('=== FULL MAZE ===')
  lines.push(renderFullMaze(game))
  lines.push('')

  // Mouse A info
  const stateA = info.states[0]
  const visionA = buildVisionResult(stateA, mazeSize)
  const resultA = info.aiResults.results[0]
  lines.push('=== MOUSE A ===')
  lines.push(`Action: ${formatAction(info.actions[0])}`)
  lines.push(`Vision: ${formatVision(visionA).replace(/\n/g, ' | ')}`)
  lines.push(`Map:`)
  lines.push(buildMemoryMap(stateA, mazeSize))
  if (resultA.toolCalls.length > 0) {
    lines.push(`Tools: ${resultA.toolCalls.join('; ')}`)
  }
  lines.push('')

  // Mouse B info
  const stateB = info.states[1]
  const visionB = buildVisionResult(stateB, mazeSize)
  const resultB = info.aiResults.results[1]
  lines.push('=== MOUSE B ===')
  lines.push(`Action: ${formatAction(info.actions[1])}`)
  lines.push(`Vision: ${formatVision(visionB).replace(/\n/g, ' | ')}`)
  lines.push(`Map:`)
  lines.push(buildMemoryMap(stateB, mazeSize))
  if (resultB.toolCalls.length > 0) {
    lines.push(`Tools: ${resultB.toolCalls.join('; ')}`)
  }

  return lines.join('\n')
}

const args = process.argv.slice(2)

if (args.length < 3) {
  console.log(`
Usage: npx tsx cli.ts <maze-size> <mouse-a-prompt> <mouse-b-prompt> [delay-ms]

Example:
  npx tsx cli.ts 11 "Always turn right when blocked" "Go straight, turn left if blocked"
  npx tsx cli.ts 15 "Right-hand rule" "Left-hand rule" 1000

Arguments:
  maze-size       Size of the square maze (odd number: 7, 9, 11, 15, 21, etc.)
  mouse-a-prompt  Strategy prompt for Mouse A (in quotes)
  mouse-b-prompt  Strategy prompt for Mouse B (in quotes)
  delay-ms        Delay between turns in milliseconds (default: 500)
`)
  process.exit(1)
}

const mazeSize = parseInt(args[0], 10)
const mouseAPrompt = args[1]
const mouseBPrompt = args[2]
const delayMs = args[3] ? parseInt(args[3], 10) : 500

if (isNaN(mazeSize) || mazeSize < 7 || mazeSize > 51) {
  console.error('Error: maze-size must be a number between 7 and 51')
  process.exit(1)
}

if (mazeSize % 2 === 0) {
  console.error('Error: maze-size must be odd (e.g., 7, 9, 11, 15, 21)')
  process.exit(1)
}

console.log('\n========================================')
console.log('       AI MAZE BATTLE')
console.log('========================================\n')
console.log(`Maze size: ${mazeSize}x${mazeSize}`)
console.log(`Mouse A: "${mouseAPrompt}"`)
console.log(`Mouse B: "${mouseBPrompt}"`)
console.log(`Delay: ${delayMs}ms`)
console.log('\n----------------------------------------\n')

async function main() {
  const maxTurns = Math.floor(mazeSize * mazeSize / 2)

  const { result, game } = await runGame(
    { name: 'Mouse A', prompt: mouseAPrompt },
    { name: 'Mouse B', prompt: mouseBPrompt },
    {
      mazeSize,
      maxTurns,
      onTurn: async (game, turn, info) => {
        logUpdate(renderGameState(game, maxTurns, info, mazeSize))

        if (game.status === 'PLAYING') {
          await sleep(delayMs)
        }
      },
      onGameEnd: (game) => {
        logUpdate.done()
        console.log('\n========================================')
        console.log('           GAME OVER!')
        console.log('========================================\n')

        if (game.result === 'PLAYER1_WIN') {
          console.log('Winner: Mouse A!')
          console.log(`Strategy: "${mouseAPrompt}"`)
        } else if (game.result === 'PLAYER2_WIN') {
          console.log('Winner: Mouse B!')
          console.log(`Strategy: "${mouseBPrompt}"`)
        } else {
          console.log("It's a DRAW!")
        }

        console.log(`\nTotal turns: ${game.turn}`)
        console.log('\n========================================\n')
      },
    }
  )
}

main().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
