import { generateText, stepCountIs } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import type { MouseAction, MouseVision, CellType } from './types'

const actionSchema = z.object({
  reason: z.string().describe('Brief reason for this action'),
})

const SYSTEM_PROMPT = `You are a mouse in a maze race. Find the exit (E) before your opponent.

## Map Symbols
- ^ v < > = You (arrow shows facing direction)
- E = Exit (goal)
- # = Wall
- . = Path
- ? = Unexplored

## Turn Rules
- First look at what you can see (front, left, right)
- Then optionally turn (turnLeft or turnRight, not both)
- Then optionally moveForward
- You MUST follow your owner's strategy exactly!`

type CellView = 'wall' | 'path' | 'exit' | 'unknown'

function cellToView(cell: CellType | 'EXIT' | 'UNKNOWN'): CellView {
  if (cell === 'EXIT') return 'exit'
  if (cell === 'UNKNOWN') return 'unknown'
  if (cell === 'WALL') return 'wall'
  return 'path'
}

function formatVision(vision: MouseVision): string {
  return [
    `FRONT: ${cellToView(vision.front)}`,
    `LEFT: ${cellToView(vision.left)}`,
    `RIGHT: ${cellToView(vision.right)}`,
  ].join('\n')
}

function buildUserPrompt(playerPrompt: string, vision: MouseVision): string {
  const visionText = formatVision(vision)

  return `## YOUR STRATEGY (follow this exactly!)
"${playerPrompt}"

Facing: ${vision.facing.toLowerCase()}
${vision.exitVisible ? `Exit visible at (${vision.exitVisible.x}, ${vision.exitVisible.y})` : 'Exit not yet visible'}
${vision.opponentVisible ? `Opponent visible at (${vision.opponentVisible.x}, ${vision.opponentVisible.y})` : ''}

## What you see:
${visionText}

## Memory map:
${vision.exploredMap}

Choose ONE action: turnLeft, turnRight, or moveForward. Follow your strategy!`
}

export interface ActionResult {
  action: MouseAction
  toolCalls: string[]
}

export async function getAction(
  playerPrompt: string,
  vision: MouseVision
): Promise<ActionResult> {
  const userPrompt = buildUserPrompt(playerPrompt, vision)

  let turnDirection: 'LEFT' | 'RIGHT' | undefined = undefined
  let shouldMove = false
  const toolCallLogs: string[] = []

  const front = cellToView(vision.front)
  const left = cellToView(vision.left)
  const right = cellToView(vision.right)

  try {
    const result = await generateText({
      model: openai.chat('gpt-4o-mini'),
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      tools: {
        turnLeft: {
          description: 'Turn 90 degrees to the left.',
          inputSchema: actionSchema,
          execute: async () => {
            const output = `Turned left.`
            toolCallLogs.push(`turnLeft() -> ${output}`)
            return output
          },
        },
        turnRight: {
          description: 'Turn 90 degrees to the right.',
          inputSchema: actionSchema,
          execute: async () => {
            const output = `Turned right.`
            toolCallLogs.push(`turnRight() -> ${output}`)
            return output
          },
        },
        moveForward: {
          description: 'Move one step forward. Only works if path is clear (not a wall).',
          inputSchema: actionSchema,
          execute: async () => {
            let output: string
            if (front === 'wall') {
              output = `Cannot move - wall directly ahead!`
            } else {
              output = `Moved forward.`
            }
            toolCallLogs.push(`moveForward() -> ${output}`)
            return output
          },
        },
      },
      stopWhen: stepCountIs(3),
      temperature: 0.3,
    })

    const allToolCalls = [
      ...(result.toolCalls || []),
      ...(result.steps?.flatMap(s => s.toolCalls || []) || []),
    ]

    for (const toolCall of allToolCalls) {
      if (toolCall.toolName === 'turnLeft' && !turnDirection) {
        turnDirection = 'LEFT'
      } else if (toolCall.toolName === 'turnRight' && !turnDirection) {
        turnDirection = 'RIGHT'
      } else if (toolCall.toolName === 'moveForward') {
        shouldMove = true
      }
    }

    // Default behavior if no action taken
    if (!turnDirection && !shouldMove) {
      if (front !== 'wall') {
        shouldMove = true
      } else if (right !== 'wall') {
        turnDirection = 'RIGHT'
      } else if (left !== 'wall') {
        turnDirection = 'LEFT'
      } else {
        turnDirection = 'RIGHT'
      }
    }

    return {
      action: { turn: turnDirection, move: shouldMove },
      toolCalls: toolCallLogs,
    }
  } catch {
    return { action: { move: true }, toolCalls: [] }
  }
}

export interface ActionsResult {
  actions: [MouseAction, MouseAction]
  results: [ActionResult, ActionResult]
}

export async function getActions(
  player1Prompt: string,
  player1Vision: MouseVision,
  player2Prompt: string,
  player2Vision: MouseVision,
  _mazeSize: number // kept for API compatibility
): Promise<ActionsResult> {
  const [result1, result2] = await Promise.all([
    getAction(player1Prompt, player1Vision),
    getAction(player2Prompt, player2Vision),
  ])

  return {
    actions: [result1.action, result2.action],
    results: [result1, result2],
  }
}
