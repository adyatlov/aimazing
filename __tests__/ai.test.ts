import { describe, it, expect } from 'vitest'
import {
  buildVisionResult,
  buildMemoryMap,
  buildUserPrompt,
  formatVision,
} from '../lib/ai'
import { VisibleState, CellType, Facing } from '../lib/types'

function createTestVisibleState(facing: Facing = 'EAST'): VisibleState {
  const exploredCells = new Map<string, CellType>([
    ['1,1', 'PATH'],
    ['2,1', 'PATH'],
    ['0,1', 'WALL'],
    ['1,0', 'WALL'],
    ['1,2', 'WALL'],
    ['3,1', 'PATH'],
  ])

  return {
    position: { x: 1, y: 1 },
    facing,
    entrance: { x: 0, y: 0 },
    exit: { x: 5, y: 5 },
    opponent: { x: 2, y: 1 },
    exploredCells,
    actionHistory: [],
  }
}

describe('buildVisionResult', () => {
  it('should report what is one step ahead in each direction', () => {
    const state = createTestVisibleState('EAST')
    const result = buildVisionResult(state, 7)

    // Facing EAST: front is (2,1)=PATH, left is (1,0)=WALL, right is (1,2)=WALL
    expect(result.front).toBe('path')
    expect(result.left).toBe('wall')
    expect(result.right).toBe('wall')
  })

  it('should report exit when one step ahead', () => {
    const exploredCells = new Map<string, CellType>([
      ['5,5', 'PATH'],
      ['5,4', 'PATH'],
    ])
    const state: VisibleState = {
      position: { x: 5, y: 5 },
      facing: 'NORTH',
      entrance: { x: 0, y: 0 },
      exit: { x: 5, y: 4 },
      opponent: null,
      exploredCells,
      actionHistory: [],
    }
    const result = buildVisionResult(state, 7)

    expect(result.front).toBe('exit')
  })

  it('should report start when one step ahead', () => {
    const exploredCells = new Map<string, CellType>([
      ['1,1', 'PATH'],
      ['0,1', 'PATH'],
    ])
    const state: VisibleState = {
      position: { x: 1, y: 1 },
      facing: 'WEST',
      entrance: { x: 0, y: 1 },
      exit: null,
      opponent: null,
      exploredCells,
      actionHistory: [],
    }
    const result = buildVisionResult(state, 7)

    expect(result.front).toBe('start')
  })

  it('should report wall for out of bounds', () => {
    const exploredCells = new Map<string, CellType>([
      ['0,0', 'PATH'],
    ])
    const state: VisibleState = {
      position: { x: 0, y: 0 },
      facing: 'NORTH',
      entrance: { x: 0, y: 0 },
      exit: null,
      opponent: null,
      exploredCells,
      actionHistory: [],
    }
    const result = buildVisionResult(state, 7)

    expect(result.front).toBe('wall')
  })
})

describe('formatVision', () => {
  it('should format vision simply', () => {
    const vision = {
      front: 'wall' as const,
      left: 'exit' as const,
      right: 'path' as const,
    }
    const text = formatVision(vision)

    expect(text).toContain('FRONT: wall')
    expect(text).toContain('LEFT: exit')
    expect(text).toContain('RIGHT: path')
  })
})

describe('buildMemoryMap', () => {
  it('should show facing arrow for current position', () => {
    const state = createTestVisibleState('EAST')
    const map = buildMemoryMap(state, 7)

    expect(map).toContain('>')
  })

  it('should show different arrow for different facings', () => {
    expect(buildMemoryMap(createTestVisibleState('NORTH'), 7)).toContain('^')
    expect(buildMemoryMap(createTestVisibleState('SOUTH'), 7)).toContain('v')
    expect(buildMemoryMap(createTestVisibleState('WEST'), 7)).toContain('<')
  })

  it('should show E for exit when visible', () => {
    const exploredCells = new Map<string, CellType>([
      ['5,5', 'PATH'],
      ['5,4', 'PATH'],
    ])
    const state: VisibleState = {
      position: { x: 5, y: 5 },
      facing: 'NORTH',
      entrance: { x: 0, y: 0 },
      exit: { x: 5, y: 4 },
      opponent: null,
      exploredCells,
      actionHistory: [],
    }
    const map = buildMemoryMap(state, 7)

    expect(map).toContain('E')
  })

  it('should show O for opponent when visible', () => {
    const state = createTestVisibleState('EAST')
    const map = buildMemoryMap(state, 7)

    expect(map).toContain('O')
  })

  it('should show # for walls and . for paths', () => {
    const state = createTestVisibleState('EAST')
    const map = buildMemoryMap(state, 7)

    expect(map).toContain('#')
    expect(map).toContain('.')
  })
})

describe('buildUserPrompt', () => {
  const mockVision = {
    front: 'wall' as const,
    left: 'wall' as const,
    right: 'wall' as const,
  }

  it('should include player strategy', () => {
    const state = createTestVisibleState('EAST')
    const prompt = buildUserPrompt('Always go right when possible', state, 7, mockVision)

    expect(prompt).toContain('Always go right when possible')
  })

  it('should include facing direction', () => {
    const state = createTestVisibleState('NORTH')
    const prompt = buildUserPrompt('Test', state, 7, mockVision)

    expect(prompt).toContain('north')
  })

  it('should include vision info', () => {
    const state = createTestVisibleState('EAST')
    const vision = {
      front: 'exit' as const,
      left: 'wall' as const,
      right: 'path' as const,
    }
    const prompt = buildUserPrompt('Test', state, 7, vision)

    expect(prompt).toContain('FRONT: exit')
    expect(prompt).toContain('LEFT: wall')
  })

  it('should include opponent when visible on map', () => {
    const state = createTestVisibleState('EAST')
    const prompt = buildUserPrompt('Test', state, 7, mockVision)

    // Opponent shown as 'O' on the map
    expect(prompt).toContain('O')
  })

  it('should include memory map with facing arrow', () => {
    const state = createTestVisibleState('EAST')
    const prompt = buildUserPrompt('Test', state, 7, mockVision)

    expect(prompt).toContain('>')
  })

  it('should instruct to choose an action', () => {
    const state = createTestVisibleState('EAST')
    const prompt = buildUserPrompt('Test', state, 7, mockVision)

    expect(prompt).toContain('Choose ONE action')
  })
})
