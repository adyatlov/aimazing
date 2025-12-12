import { describe, it, expect } from 'vitest'
import { generateMaze, hasPath, findPath, manhattanDistance, mazeToAscii } from '../server/lib/maze'

describe('generateMaze', () => {
  it('should generate a maze of correct size', () => {
    const { maze } = generateMaze(15)
    expect(maze.length).toBe(15)
    expect(maze[0].length).toBe(15)
  })

  it('should have entrance and exit as PATH cells', () => {
    const { maze, entrance, exit } = generateMaze(15)
    expect(maze[entrance.y][entrance.x]).toBe('PATH')
    expect(maze[exit.y][exit.x]).toBe('PATH')
  })

  it('should generate a solvable maze (verified by BFS)', () => {
    // Run multiple times to ensure consistency
    for (let i = 0; i < 20; i++) {
      const { maze, entrance, exit } = generateMaze(15)
      expect(hasPath(maze, entrance, exit)).toBe(true)
    }
  })

  it('should include the solution path in the maze', () => {
    for (let i = 0; i < 10; i++) {
      const { maze, entrance, exit, solutionPath } = generateMaze(15)

      // Solution path should start at entrance and end at exit
      expect(solutionPath[0]).toEqual(entrance)
      expect(solutionPath[solutionPath.length - 1]).toEqual(exit)

      // Every cell in solution path should be a PATH in the maze
      for (const pos of solutionPath) {
        expect(maze[pos.y][pos.x]).toBe('PATH')
      }
    }
  })

  it('should place entrance on left edge and exit on right edge', () => {
    for (let i = 0; i < 10; i++) {
      const { maze, entrance, exit } = generateMaze(15)
      expect(entrance.x).toBe(1) // Left edge (inside wall)
      expect(exit.x).toBe(maze.length - 2) // Right edge (inside wall)
    }
  })

  it('should work with different sizes', () => {
    for (const size of [7, 11, 15, 21]) {
      const { maze, entrance, exit, solutionPath } = generateMaze(size)
      expect(maze.length).toBe(size)
      expect(hasPath(maze, entrance, exit)).toBe(true)
      expect(solutionPath.length).toBeGreaterThan(0)
    }
  })

  it('should find shortest path that is at most as long as solution path', () => {
    for (let i = 0; i < 10; i++) {
      const { maze, entrance, exit, solutionPath } = generateMaze(15)
      const shortestPath = findPath(maze, entrance, exit)

      expect(shortestPath).not.toBeNull()
      // Shortest path should be <= solution path (branches may create shortcuts)
      expect(shortestPath!.length).toBeLessThanOrEqual(solutionPath.length)
    }
  })
})

describe('hasPath', () => {
  it('should return true for connected cells', () => {
    const maze = [
      ['WALL', 'WALL', 'WALL'],
      ['PATH', 'PATH', 'PATH'],
      ['WALL', 'WALL', 'WALL'],
    ] as const

    expect(hasPath(maze as any, { x: 0, y: 1 }, { x: 2, y: 1 })).toBe(true)
  })

  it('should return false for disconnected cells', () => {
    const maze = [
      ['WALL', 'WALL', 'WALL'],
      ['PATH', 'WALL', 'PATH'],
      ['WALL', 'WALL', 'WALL'],
    ] as const

    expect(hasPath(maze as any, { x: 0, y: 1 }, { x: 2, y: 1 })).toBe(false)
  })

  it('should return true for same start and end', () => {
    const maze = [
      ['PATH', 'WALL'],
      ['WALL', 'WALL'],
    ] as const

    expect(hasPath(maze as any, { x: 0, y: 0 }, { x: 0, y: 0 })).toBe(true)
  })
})

describe('manhattanDistance', () => {
  it('should calculate correct distance', () => {
    expect(manhattanDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(7)
    expect(manhattanDistance({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0)
    expect(manhattanDistance({ x: 0, y: 0 }, { x: 14, y: 14 })).toBe(28)
  })
})

describe('mazeToAscii', () => {
  it('should render maze correctly', () => {
    const maze = [
      ['WALL', 'WALL', 'WALL'],
      ['PATH', 'PATH', 'PATH'],
      ['WALL', 'WALL', 'WALL'],
    ] as const

    const ascii = mazeToAscii(maze as any)
    expect(ascii).toBe('###\n...\n###')
  })

  it('should show entrance and exit', () => {
    const maze = [
      ['PATH', 'WALL', 'PATH'],
    ] as const

    const ascii = mazeToAscii(maze as any, { x: 0, y: 0 }, { x: 2, y: 0 })
    expect(ascii).toBe('S#E')
  })

  it('should show mice positions', () => {
    const maze = [
      ['PATH', 'PATH', 'PATH'],
    ] as const

    const ascii = mazeToAscii(maze as any, undefined, undefined, [{ x: 0, y: 0 }, { x: 2, y: 0 }])
    expect(ascii).toBe('1.2')
  })
})
