import { describe, it, expect } from 'vitest'
import {
  createGame,
  createGameWithMaze,
  addPlayer,
  getMouseVision,
  applyAction,
  executeTurn,
  checkGameEnd,
  visibleStateToAscii,
  turnLeft,
  turnRight,
  getPositionInFront,
  facingToArrow,
} from '../server/lib/game'
import { Maze, Position, Game, MouseAction } from '../server/lib/types'

// Helper to create a simple test maze
function createTestMaze(): { maze: Maze; entrance: Position; exit: Position } {
  // 5x5 maze with clear path from entrance (1,1) to exit (3,3)
  const maze: Maze = [
    ['WALL', 'WALL', 'WALL', 'WALL', 'WALL'],
    ['WALL', 'PATH', 'PATH', 'PATH', 'WALL'],
    ['WALL', 'WALL', 'WALL', 'PATH', 'WALL'],
    ['WALL', 'PATH', 'PATH', 'PATH', 'WALL'],
    ['WALL', 'WALL', 'WALL', 'WALL', 'WALL'],
  ]
  return {
    maze,
    entrance: { x: 1, y: 1 },
    exit: { x: 3, y: 3 },
  }
}

describe('createGame', () => {
  it('should create a game with correct initial state', () => {
    const game = createGame(15, 200)
    expect(game.players).toHaveLength(0)
    expect(game.turn).toBe(0)
    expect(game.maxTurns).toBe(200)
    expect(game.status).toBe('WAITING')
    expect(game.result).toBeNull()
    expect(game.maze.length).toBe(15)
  })
})

describe('createGameWithMaze', () => {
  it('should create a game with specific maze', () => {
    const { maze, entrance, exit } = createTestMaze()
    const game = createGameWithMaze(maze, entrance, exit, 100)

    expect(game.maze).toBe(maze)
    expect(game.entrance).toEqual(entrance)
    expect(game.exit).toEqual(exit)
    expect(game.maxTurns).toBe(100)
  })
})

describe('addPlayer', () => {
  it('should add a player to the game', () => {
    const { maze, entrance, exit } = createTestMaze()
    let game = createGameWithMaze(maze, entrance, exit)

    game = addPlayer(game, 'Player 1', 'Go right')

    expect(game.players).toHaveLength(1)
    expect(game.players[0].name).toBe('Player 1')
    expect(game.players[0].prompt).toBe('Go right')
    expect(game.players[0].mouse.position).toEqual(entrance)
    expect(game.players[0].mouse.facing).toBe('EAST')
    expect(game.status).toBe('WAITING')
  })

  it('should start game when second player joins', () => {
    const { maze, entrance, exit } = createTestMaze()
    let game = createGameWithMaze(maze, entrance, exit)

    game = addPlayer(game, 'Player 1', 'Go right')
    game = addPlayer(game, 'Player 2', 'Go left')

    expect(game.players).toHaveLength(2)
    expect(game.status).toBe('PLAYING')
  })

  it('should throw error when adding third player', () => {
    const { maze, entrance, exit } = createTestMaze()
    let game = createGameWithMaze(maze, entrance, exit)

    game = addPlayer(game, 'Player 1', 'Go right')
    game = addPlayer(game, 'Player 2', 'Go left')

    expect(() => addPlayer(game, 'Player 3', 'Go up')).toThrow('Game already has 2 players')
  })

  it('should initialize mouse explored area with visible cells', () => {
    const { maze, entrance, exit } = createTestMaze()
    let game = createGameWithMaze(maze, entrance, exit)

    game = addPlayer(game, 'Player 1', 'Go right')

    const explored = game.players[0].mouse.explored
    // Should have entrance and cells visible based on facing (EAST)
    expect(explored.has('1,1')).toBe(true) // current position
    expect(explored.has('2,1')).toBe(true) // front (facing EAST)
    expect(explored.has('1,0')).toBe(true) // left (NORTH when facing EAST)
    expect(explored.has('1,2')).toBe(true) // right (SOUTH when facing EAST)
  })
})

describe('getMouseVision', () => {
  it('should return correct visible state', () => {
    const { maze, entrance, exit } = createTestMaze()
    let game = createGameWithMaze(maze, entrance, exit)
    game = addPlayer(game, 'Player 1', 'Go right')
    game = addPlayer(game, 'Player 2', 'Go left')

    const vision = getMouseVision(game, 0)

    expect(vision.position).toEqual(entrance)
    expect(vision.facing).toBe('EAST')
    expect(vision.actionHistory).toHaveLength(0)
  })

  it('should show opponent when in explored area', () => {
    const { maze, entrance, exit } = createTestMaze()
    let game = createGameWithMaze(maze, entrance, exit)
    game = addPlayer(game, 'Player 1', 'Go right')
    game = addPlayer(game, 'Player 2', 'Go left')

    // Both players start at entrance, so they can see each other
    const vision = getMouseVision(game, 0)
    expect(vision.opponent).toEqual(entrance)
  })

  it('should hide exit if not explored', () => {
    const { maze, entrance, exit } = createTestMaze()
    let game = createGameWithMaze(maze, entrance, exit)
    game = addPlayer(game, 'Player 1', 'Go right')

    const vision = getMouseVision(game, 0)
    // Exit at (3,3) is not adjacent to entrance (1,1)
    expect(vision.exit).toBeNull()
  })
})

describe('turnLeft and turnRight', () => {
  it('should turn left correctly', () => {
    expect(turnLeft('NORTH')).toBe('WEST')
    expect(turnLeft('WEST')).toBe('SOUTH')
    expect(turnLeft('SOUTH')).toBe('EAST')
    expect(turnLeft('EAST')).toBe('NORTH')
  })

  it('should turn right correctly', () => {
    expect(turnRight('NORTH')).toBe('EAST')
    expect(turnRight('EAST')).toBe('SOUTH')
    expect(turnRight('SOUTH')).toBe('WEST')
    expect(turnRight('WEST')).toBe('NORTH')
  })
})

describe('getPositionInFront', () => {
  it('should return correct position based on facing', () => {
    const pos = { x: 5, y: 5 }
    expect(getPositionInFront(pos, 'NORTH')).toEqual({ x: 5, y: 4 })
    expect(getPositionInFront(pos, 'SOUTH')).toEqual({ x: 5, y: 6 })
    expect(getPositionInFront(pos, 'EAST')).toEqual({ x: 6, y: 5 })
    expect(getPositionInFront(pos, 'WEST')).toEqual({ x: 4, y: 5 })
  })
})

describe('facingToArrow', () => {
  it('should convert facing to arrow character', () => {
    expect(facingToArrow('NORTH')).toBe('^')
    expect(facingToArrow('SOUTH')).toBe('v')
    expect(facingToArrow('EAST')).toBe('>')
    expect(facingToArrow('WEST')).toBe('<')
  })
})

describe('applyAction', () => {
  it('should move mouse forward when path is clear', () => {
    const { maze, entrance, exit } = createTestMaze()
    let game = createGameWithMaze(maze, entrance, exit)
    game = addPlayer(game, 'Player 1', 'Go right')

    // Mouse starts facing EAST, (2,1) is PATH
    const action: MouseAction = { move: true }
    game = applyAction(game, 0, action)

    expect(game.players[0].mouse.position).toEqual({ x: 2, y: 1 })
    expect(game.players[0].mouse.actionHistory).toHaveLength(1)
  })

  it('should not move into wall', () => {
    const { maze, entrance, exit } = createTestMaze()
    let game = createGameWithMaze(maze, entrance, exit)
    game = addPlayer(game, 'Player 1', 'Go right')

    // Turn to face SOUTH (wall at 1,2)
    const turnAction: MouseAction = { turn: 'RIGHT', move: false }
    game = applyAction(game, 0, turnAction)

    // Now facing SOUTH, try to move into wall
    const moveAction: MouseAction = { move: true }
    game = applyAction(game, 0, moveAction)

    // Should stay in place (bumped into wall)
    expect(game.players[0].mouse.position).toEqual({ x: 1, y: 1 })
  })

  it('should turn left correctly', () => {
    const { maze, entrance, exit } = createTestMaze()
    let game = createGameWithMaze(maze, entrance, exit)
    game = addPlayer(game, 'Player 1', 'Go right')

    // Mouse starts facing EAST
    const action: MouseAction = { turn: 'LEFT', move: false }
    game = applyAction(game, 0, action)

    expect(game.players[0].mouse.facing).toBe('NORTH')
    expect(game.players[0].mouse.position).toEqual({ x: 1, y: 1 }) // Didn't move
  })

  it('should turn right correctly', () => {
    const { maze, entrance, exit } = createTestMaze()
    let game = createGameWithMaze(maze, entrance, exit)
    game = addPlayer(game, 'Player 1', 'Go right')

    // Mouse starts facing EAST
    const action: MouseAction = { turn: 'RIGHT', move: false }
    game = applyAction(game, 0, action)

    expect(game.players[0].mouse.facing).toBe('SOUTH')
  })

  it('should turn and move in same action', () => {
    const { maze, entrance, exit } = createTestMaze()
    let game = createGameWithMaze(maze, entrance, exit)
    game = addPlayer(game, 'Player 1', 'Go right')

    // Mouse starts at (1,1) facing EAST
    // Turn LEFT (now facing NORTH) and move (to 1,0 which is WALL)
    const action: MouseAction = { turn: 'LEFT', move: true }
    game = applyAction(game, 0, action)

    expect(game.players[0].mouse.facing).toBe('NORTH')
    // Can't move into wall at (1,0), stays at (1,1)
    expect(game.players[0].mouse.position).toEqual({ x: 1, y: 1 })
  })

  it('should expand explored area after action', () => {
    const { maze, entrance, exit } = createTestMaze()
    let game = createGameWithMaze(maze, entrance, exit)
    game = addPlayer(game, 'Player 1', 'Go right')

    // Move forward (EAST) to (2,1)
    const action: MouseAction = { move: true }
    game = applyAction(game, 0, action)

    // Should now see (3,1) which is in front
    expect(game.players[0].mouse.explored.has('3,1')).toBe(true)
  })
})

describe('executeTurn', () => {
  it('should execute actions for both players simultaneously', () => {
    const { maze, entrance, exit } = createTestMaze()
    let game = createGameWithMaze(maze, entrance, exit)
    game = addPlayer(game, 'Player 1', 'Go right')
    game = addPlayer(game, 'Player 2', 'Go right')

    const actions: [MouseAction, MouseAction] = [
      { move: true },
      { move: true },
    ]
    game = executeTurn(game, actions)

    expect(game.players[0].mouse.position).toEqual({ x: 2, y: 1 })
    expect(game.players[1].mouse.position).toEqual({ x: 2, y: 1 })
    expect(game.turn).toBe(1)
  })

  it('should throw if game not playing', () => {
    const { maze, entrance, exit } = createTestMaze()
    const game = createGameWithMaze(maze, entrance, exit)

    const actions: [MouseAction, MouseAction] = [
      { move: true },
      { move: true },
    ]
    expect(() => executeTurn(game, actions)).toThrow('Game is not in playing state')
  })
})

describe('checkGameEnd', () => {
  it('should detect player 1 win', () => {
    const { maze, entrance, exit } = createTestMaze()
    let game = createGameWithMaze(maze, entrance, exit)
    game = addPlayer(game, 'Player 1', 'Go right')
    game = addPlayer(game, 'Player 2', 'Go right')

    // Manually move player 1 to exit
    game = {
      ...game,
      players: [
        {
          ...game.players[0],
          mouse: {
            ...game.players[0].mouse,
            position: { ...exit },
          },
        },
        game.players[1],
      ],
    }

    game = checkGameEnd(game)

    expect(game.status).toBe('FINISHED')
    expect(game.result).toBe('PLAYER1_WIN')
  })

  it('should detect draw when both reach exit', () => {
    const { maze, entrance, exit } = createTestMaze()
    let game = createGameWithMaze(maze, entrance, exit)
    game = addPlayer(game, 'Player 1', 'Go right')
    game = addPlayer(game, 'Player 2', 'Go right')

    // Move both to exit
    game = {
      ...game,
      players: [
        {
          ...game.players[0],
          mouse: {
            ...game.players[0].mouse,
            position: { ...exit },
          },
        },
        {
          ...game.players[1],
          mouse: {
            ...game.players[1].mouse,
            position: { ...exit },
          },
        },
      ],
    }

    game = checkGameEnd(game)

    expect(game.status).toBe('FINISHED')
    expect(game.result).toBe('DRAW')
  })

  it('should detect draw on turn limit', () => {
    const { maze, entrance, exit } = createTestMaze()
    let game = createGameWithMaze(maze, entrance, exit, 10)
    game = addPlayer(game, 'Player 1', 'Go right')
    game = addPlayer(game, 'Player 2', 'Go right')

    // Set turn to max
    game = {
      ...game,
      turn: 10,
    }

    game = checkGameEnd(game)

    expect(game.status).toBe('FINISHED')
    expect(game.result).toBe('DRAW')
  })
})

describe('visibleStateToAscii', () => {
  it('should render visible state with facing arrow', () => {
    const { maze, entrance, exit } = createTestMaze()
    let game = createGameWithMaze(maze, entrance, exit)
    game = addPlayer(game, 'Player 1', 'Go right')
    game = addPlayer(game, 'Player 2', 'Go right')

    const vision = getMouseVision(game, 0)
    const ascii = visibleStateToAscii(vision, 5)

    // Should show > for current position (facing EAST)
    expect(ascii).toContain('>')
  })
})
