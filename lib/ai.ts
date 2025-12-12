import { generateText, stepCountIs } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { VisibleState, Position, Facing, CellType, MouseAction } from './types'

// Workaround: use a simple string parameter since empty z.object({}) doesn't work in AI SDK 5
const actionSchema = z.object({
  reason: z.string().describe('Brief reason for this action'),
})
import {
  getPositionInFront,
  facingToArrow,
  turnLeft,
  turnRight,
} from './game'

/**
 * System prompt - minimal explanation, let user strategy drive behavior
 */
const SYSTEM_PROMPT = `You are a mouse in a maze race. Find the exit (E) before your opponent.

## Map Symbols
- ^ v < > = You (arrow shows facing direction)
- S = Start
- E = Exit (goal)
- # = Wall
- . = Path
- ? = Unexplored

## Turn Rules
- First call see() to look around
- Then optionally turn (turnLeft or turnRight, not both)
- Then optionally moveForward
- You MUST follow your owner's strategy exactly!`

/**
 * What the mouse sees in one direction (one step only)
 */
type CellView = 'wall' | 'path' | 'start' | 'exit'

/**
 * What the mouse sees in all directions
 */
interface VisionResult {
  front: CellView
  left: CellView
  right: CellView
}

/**
 * Look one step in a direction
 */
function lookOneStep(
  position: Position,
  facing: Facing,
  entrance: Position,
  exit: Position | null,
  mazeSize: number,
  exploredCells: Map<string, CellType>
): CellView {
  const next = getPositionInFront(position, facing)

  // Check bounds
  if (next.x < 0 || next.x >= mazeSize || next.y < 0 || next.y >= mazeSize) {
    return 'wall'
  }

  // Check if it's the exit
  if (exit && next.x === exit.x && next.y === exit.y) {
    return 'exit'
  }

  // Check if it's the entrance/start
  if (next.x === entrance.x && next.y === entrance.y) {
    return 'start'
  }

  const key = `${next.x},${next.y}`
  const cell = exploredCells.get(key)

  // Wall or unexplored = wall
  if (!cell || cell === 'WALL') {
    return 'wall'
  }

  return 'path'
}

/**
 * Build what the mouse sees from its current position (one step in each direction)
 */
function buildVisionResult(state: VisibleState, mazeSize: number): VisionResult {
  const { position, facing, entrance, exit, exploredCells } = state

  return {
    front: lookOneStep(position, facing, entrance, exit, mazeSize, exploredCells),
    left: lookOneStep(position, turnLeft(facing), entrance, exit, mazeSize, exploredCells),
    right: lookOneStep(position, turnRight(facing), entrance, exit, mazeSize, exploredCells),
  }
}

/**
 * Format vision result as a string for the AI
 */
function formatVision(vision: VisionResult): string {
  return [
    `FRONT: ${vision.front}`,
    `LEFT: ${vision.left}`,
    `RIGHT: ${vision.right}`,
  ].join('\n')
}

/**
 * Build a compact memory map showing only explored area
 */
function buildMemoryMap(state: VisibleState, mazeSize: number): string {
  // Find bounds of explored area
  let minX = mazeSize, maxX = 0, minY = mazeSize, maxY = 0

  for (const key of state.exploredCells.keys()) {
    const [x, y] = key.split(',').map(Number)
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
  }

  // Include current position
  minX = Math.min(minX, state.position.x)
  maxX = Math.max(maxX, state.position.x)
  minY = Math.min(minY, state.position.y)
  maxY = Math.max(maxY, state.position.y)

  const lines: string[] = []
  for (let y = minY; y <= maxY; y++) {
    let line = ''
    for (let x = minX; x <= maxX; x++) {
      const key = `${x},${y}`

      if (state.position.x === x && state.position.y === y) {
        line += facingToArrow(state.facing)
      } else if (state.exit && state.exit.x === x && state.exit.y === y) {
        line += 'E'
      } else if (state.entrance.x === x && state.entrance.y === y) {
        line += 'S'
      } else if (state.opponent && state.opponent.x === x && state.opponent.y === y) {
        line += 'O'
      } else if (state.exploredCells.has(key)) {
        line += state.exploredCells.get(key) === 'WALL' ? '#' : '.'
      } else {
        line += '?'
      }
    }
    lines.push(line)
  }

  return lines.join('\n')
}

/**
 * Build the user prompt with current game state
 */
function buildUserPrompt(playerPrompt: string, state: VisibleState, mazeSize: number, vision: VisionResult): string {
  const memoryMap = buildMemoryMap(state, mazeSize)
  const turnNum = state.actionHistory.length + 1
  const visionText = formatVision(vision)

  return `## YOUR STRATEGY (follow this exactly!)
"${playerPrompt}"

Turn: ${turnNum}, Facing: ${state.facing.toLowerCase()}

## What you see:
${visionText}

## Memory map:
${memoryMap}

Choose ONE action: turnLeft, turnRight, or moveForward. Follow your strategy!`
}

/** Result from getAction including debug info */
export interface ActionResult {
  action: MouseAction
  toolCalls: string[]
}

/**
 * Get an action from the AI
 */
export async function getAction(
  playerPrompt: string,
  state: VisibleState,
  mazeSize: number
): Promise<ActionResult> {
  const vision = buildVisionResult(state, mazeSize)
  const userPrompt = buildUserPrompt(playerPrompt, state, mazeSize, vision)

  // Track what the AI decides
  let turnDirection: 'LEFT' | 'RIGHT' | undefined = undefined
  let shouldMove = false
  const toolCallLogs: string[] = []

  try {
    const result = await generateText({
      model: openai.chat('gpt-4o-mini'),
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      tools: {
        turnLeft: {
          description: 'Turn 90 degrees to the left. Returns what you see after turning.',
          inputSchema: actionSchema,
          execute: async () => {
            const newFacing = turnLeft(state.facing)
            const newVision = buildVisionResult({ ...state, facing: newFacing }, mazeSize)
            const output = `Turned left. Now facing ${newFacing.toLowerCase()}.\n${formatVision(newVision)}`
            toolCallLogs.push(`turnLeft() -> ${output}`)
            return output
          },
        },
        turnRight: {
          description: 'Turn 90 degrees to the right. Returns what you see after turning.',
          inputSchema: actionSchema,
          execute: async () => {
            const newFacing = turnRight(state.facing)
            const newVision = buildVisionResult({ ...state, facing: newFacing }, mazeSize)
            const output = `Turned right. Now facing ${newFacing.toLowerCase()}.\n${formatVision(newVision)}`
            toolCallLogs.push(`turnRight() -> ${output}`)
            return output
          },
        },
        moveForward: {
          description: 'Move one step forward. Only works if path is clear (not a wall). Returns what you see after moving.',
          inputSchema: actionSchema,
          execute: async () => {
            let output: string
            if (vision.front === 'wall') {
              output = `Cannot move - wall directly ahead! Choose turnLeft or turnRight instead.`
            } else {
              output = `Moved forward.\n${formatVision(vision)}`
            }
            toolCallLogs.push(`moveForward() -> ${output}`)
            return output
          },
        },
      },
      stopWhen: stepCountIs(3),
      temperature: 0.3,
    })

    // Process all tool calls to determine the action
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

    // If no action was taken, default based on vision
    if (!turnDirection && !shouldMove) {
      if (vision.front !== 'wall') {
        shouldMove = true
      } else if (vision.right !== 'wall') {
        turnDirection = 'RIGHT'
      } else if (vision.left !== 'wall') {
        turnDirection = 'LEFT'
      } else {
        // Dead end, turn around
        turnDirection = 'RIGHT'
      }
    }

    return {
      action: {
        turn: turnDirection,
        move: shouldMove,
      },
      toolCalls: toolCallLogs,
    }
  } catch (error) {
    // Silently fall back to default behavior on error
    return { action: { move: true }, toolCalls: [] }
  }
}

/** Combined results from both players */
export interface ActionsResult {
  actions: [MouseAction, MouseAction]
  results: [ActionResult, ActionResult]
}

/**
 * Get actions for both players in parallel
 */
export async function getActions(
  player1Prompt: string,
  player1State: VisibleState,
  player2Prompt: string,
  player2State: VisibleState,
  mazeSize: number
): Promise<ActionsResult> {
  const result1 = await getAction(player1Prompt, player1State, mazeSize)
  const result2 = await getAction(player2Prompt, player2State, mazeSize)

  return {
    actions: [result1.action, result2.action],
    results: [result1, result2],
  }
}

// Export for tests
export { buildVisionResult, buildMemoryMap, buildUserPrompt, formatVision }
