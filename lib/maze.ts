import { Maze, CellType, Position } from './types'

export interface MazeResult {
  maze: Maze
  entrance: Position
  exit: Position
  solutionPath: Position[] // The guaranteed path from entrance to exit
}

/**
 * Generate a maze by first creating a guaranteed solution path,
 * then building the maze structure around it.
 * This ensures the maze is always solvable by construction.
 */
export function generateMaze(size: number): MazeResult {
  // Ensure odd size for proper maze structure
  const mazeSize = size % 2 === 0 ? size + 1 : size

  // Initialize maze with all walls
  const maze: Maze = Array(mazeSize)
    .fill(null)
    .map(() => Array(mazeSize).fill('WALL' as CellType))

  // Step 1: Pick entrance and exit on opposite sides
  const entrance = pickEdgePosition(mazeSize, 'left')
  const exit = pickEdgePosition(mazeSize, 'right')

  // Step 2: Generate a random path from entrance to exit
  const solutionPath = generateRandomPath(maze, entrance, exit, mazeSize)

  // Step 3: Carve the solution path into the maze
  for (const pos of solutionPath) {
    maze[pos.y][pos.x] = 'PATH'
  }

  // Step 4: Add additional paths using recursive backtracking from the solution path
  // This creates a more interesting maze with multiple routes
  addBranchPaths(maze, solutionPath, mazeSize)

  return { maze, entrance, exit, solutionPath }
}

/**
 * Pick a position on the edge of the maze
 */
function pickEdgePosition(size: number, side: 'left' | 'right' | 'top' | 'bottom'): Position {
  // Use odd coordinates to align with maze grid
  const oddCoords = []
  for (let i = 1; i < size - 1; i += 2) {
    oddCoords.push(i)
  }
  const randomOdd = oddCoords[Math.floor(Math.random() * oddCoords.length)]

  switch (side) {
    case 'left':
      return { x: 1, y: randomOdd }
    case 'right':
      return { x: size - 2, y: randomOdd }
    case 'top':
      return { x: randomOdd, y: 1 }
    case 'bottom':
      return { x: randomOdd, y: size - 2 }
  }
}

/**
 * Generate a random path from start to end using a biased random walk
 */
function generateRandomPath(maze: Maze, start: Position, end: Position, size: number): Position[] {
  const path: Position[] = [start]
  const visited = new Set<string>()
  visited.add(posKey(start))

  let current = { ...start }

  while (current.x !== end.x || current.y !== end.y) {
    const neighbors = getValidNeighbors(current, size, visited, end)

    if (neighbors.length === 0) {
      // Dead end - backtrack
      path.pop()
      if (path.length === 0) {
        // Restart if completely stuck
        path.push(start)
        visited.clear()
        visited.add(posKey(start))
        current = { ...start }
        continue
      }
      current = path[path.length - 1]
      continue
    }

    // Bias towards the exit direction
    const next = pickBiasedNeighbor(neighbors, end)

    // Add the cell between current and next (carve through wall)
    const between = {
      x: current.x + (next.x - current.x) / 2,
      y: current.y + (next.y - current.y) / 2,
    }

    visited.add(posKey(between))
    visited.add(posKey(next))
    path.push(between)
    path.push(next)
    current = next
  }

  return path
}

/**
 * Get valid neighboring cells (2 steps away, with wall in between)
 */
function getValidNeighbors(
  pos: Position,
  size: number,
  visited: Set<string>,
  target: Position
): Position[] {
  const directions = [
    { dx: 0, dy: -2 }, // up
    { dx: 0, dy: 2 }, // down
    { dx: -2, dy: 0 }, // left
    { dx: 2, dy: 0 }, // right
  ]

  const neighbors: Position[] = []

  for (const { dx, dy } of directions) {
    const nx = pos.x + dx
    const ny = pos.y + dy

    if (nx > 0 && nx < size - 1 && ny > 0 && ny < size - 1) {
      if (!visited.has(posKey({ x: nx, y: ny }))) {
        neighbors.push({ x: nx, y: ny })
      }
      // Always allow moving to target even if visited
      if (nx === target.x && ny === target.y) {
        neighbors.push({ x: nx, y: ny })
      }
    }
  }

  return neighbors
}

/**
 * Pick a neighbor with bias towards the target
 */
function pickBiasedNeighbor(neighbors: Position[], target: Position): Position {
  // 70% chance to pick the neighbor closest to target
  if (Math.random() < 0.7) {
    let best = neighbors[0]
    let bestDist = manhattanDistance(best, target)

    for (const n of neighbors) {
      const dist = manhattanDistance(n, target)
      if (dist < bestDist) {
        bestDist = dist
        best = n
      }
    }
    return best
  }

  // 30% chance to pick randomly
  return neighbors[Math.floor(Math.random() * neighbors.length)]
}

/**
 * Add branch paths from the solution path to make the maze more interesting
 */
function addBranchPaths(maze: Maze, solutionPath: Position[], size: number): void {
  const visited = new Set<string>()

  // Mark all solution path cells as visited
  for (const pos of solutionPath) {
    visited.add(posKey(pos))
  }

  // Shuffle solution path and try to branch from each point
  const branchPoints = [...solutionPath].filter((_, i) => i % 2 === 0) // Only branch from cell positions, not walls
  shuffle(branchPoints)

  for (const start of branchPoints) {
    carveFrom(maze, start, size, visited)
  }
}

/**
 * Carve additional paths using recursive backtracking
 */
function carveFrom(maze: Maze, start: Position, size: number, visited: Set<string>): void {
  const stack: Position[] = [start]

  while (stack.length > 0) {
    const current = stack[stack.length - 1]
    const neighbors = getUnvisitedNeighbors(current, size, visited)

    if (neighbors.length === 0) {
      stack.pop()
      continue
    }

    // Pick random neighbor
    const next = neighbors[Math.floor(Math.random() * neighbors.length)]

    // Carve path
    const wallX = current.x + (next.x - current.x) / 2
    const wallY = current.y + (next.y - current.y) / 2

    maze[wallY][wallX] = 'PATH'
    maze[next.y][next.x] = 'PATH'

    visited.add(posKey({ x: wallX, y: wallY }))
    visited.add(posKey(next))

    stack.push(next)
  }
}

function getUnvisitedNeighbors(pos: Position, size: number, visited: Set<string>): Position[] {
  const directions = [
    { dx: 0, dy: -2 },
    { dx: 0, dy: 2 },
    { dx: -2, dy: 0 },
    { dx: 2, dy: 0 },
  ]

  const neighbors: Position[] = []

  for (const { dx, dy } of directions) {
    const nx = pos.x + dx
    const ny = pos.y + dy

    if (nx > 0 && nx < size - 1 && ny > 0 && ny < size - 1 && !visited.has(posKey({ x: nx, y: ny }))) {
      neighbors.push({ x: nx, y: ny })
    }
  }

  return neighbors
}

function posKey(pos: Position): string {
  return `${pos.x},${pos.y}`
}

function shuffle<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
}

export function manhattanDistance(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

/**
 * Check if there's a path from start to end using BFS
 */
export function hasPath(maze: Maze, start: Position, end: Position): boolean {
  const size = maze.length
  const visited = new Set<string>()
  const queue: Position[] = [start]

  visited.add(posKey(start))

  while (queue.length > 0) {
    const current = queue.shift()!

    if (current.x === end.x && current.y === end.y) {
      return true
    }

    const directions = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
    ]

    for (const { dx, dy } of directions) {
      const nx = current.x + dx
      const ny = current.y + dy
      const key = posKey({ x: nx, y: ny })

      if (nx >= 0 && nx < size && ny >= 0 && ny < size && maze[ny][nx] === 'PATH' && !visited.has(key)) {
        visited.add(key)
        queue.push({ x: nx, y: ny })
      }
    }
  }

  return false
}

/**
 * Find the shortest path using BFS
 */
export function findPath(maze: Maze, start: Position, end: Position): Position[] | null {
  const size = maze.length
  const visited = new Set<string>()
  const queue: { pos: Position; path: Position[] }[] = [{ pos: start, path: [start] }]

  visited.add(posKey(start))

  while (queue.length > 0) {
    const { pos: current, path } = queue.shift()!

    if (current.x === end.x && current.y === end.y) {
      return path
    }

    const directions = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
    ]

    for (const { dx, dy } of directions) {
      const nx = current.x + dx
      const ny = current.y + dy
      const next = { x: nx, y: ny }
      const key = posKey(next)

      if (nx >= 0 && nx < size && ny >= 0 && ny < size && maze[ny][nx] === 'PATH' && !visited.has(key)) {
        visited.add(key)
        queue.push({ pos: next, path: [...path, next] })
      }
    }
  }

  return null
}

/**
 * Convert maze to ASCII representation for debugging
 */
export function mazeToAscii(maze: Maze, entrance?: Position, exit?: Position, mice?: Position[]): string {
  return maze
    .map((row, y) =>
      row
        .map((cell, x) => {
          if (entrance && entrance.x === x && entrance.y === y) return 'S'
          if (exit && exit.x === x && exit.y === y) return 'E'
          if (mice) {
            for (let i = 0; i < mice.length; i++) {
              if (mice[i].x === x && mice[i].y === y) return String(i + 1)
            }
          }
          return cell === 'WALL' ? '#' : '.'
        })
        .join('')
    )
    .join('\n')
}
