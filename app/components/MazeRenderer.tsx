'use client'

import type { SerializedGame } from '../../api/client'

interface MazeRendererProps {
  game: SerializedGame
  size?: 'sm' | 'md' | 'lg'
}

const FACING_ARROWS: Record<string, string> = {
  NORTH: '^',
  SOUTH: 'v',
  EAST: '>',
  WEST: '<',
}

const PLAYER_COLORS = ['#22c55e', '#3b82f6'] // green, blue
const PLAYER_BG = ['rgba(34, 197, 94, 0.2)', 'rgba(59, 130, 246, 0.2)']

export function MazeRenderer({ game, size = 'md' }: MazeRendererProps) {
  const mazeSize = game.maze.length

  const cellSizes = {
    sm: Math.min(16, Math.floor(300 / mazeSize)),
    md: Math.min(24, Math.floor(500 / mazeSize)),
    lg: Math.min(32, Math.floor(700 / mazeSize)),
  }
  const cellSize = cellSizes[size]
  const fontSize = size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'

  return (
    <div
      className="grid gap-0 border border-zinc-700 rounded-lg overflow-hidden bg-zinc-900"
      style={{
        gridTemplateColumns: `repeat(${mazeSize}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${mazeSize}, ${cellSize}px)`,
      }}
    >
      {game.maze.map((row, y) =>
        row.map((cell, x) => {
          const isWall = cell === 'WALL'
          const isEntrance = game.entrance.x === x && game.entrance.y === y
          const isExit = game.exit.x === x && game.exit.y === y

          // Check for mice (both could be on same cell)
          const miceHere: number[] = []
          for (let i = 0; i < game.players.length; i++) {
            const player = game.players[i]
            if (player.mouse.position.x === x && player.mouse.position.y === y) {
              miceHere.push(i)
            }
          }

          let bgColor = isWall ? 'bg-zinc-800' : 'bg-zinc-950'
          if (isEntrance && miceHere.length === 0) bgColor = 'bg-yellow-900/30'
          if (isExit && miceHere.length === 0) bgColor = 'bg-emerald-900/40'

          return (
            <div
              key={`${x}-${y}`}
              className={`flex items-center justify-center ${fontSize} font-bold ${bgColor} border-zinc-800/50 border-[0.5px]`}
              style={{
                width: cellSize,
                height: cellSize,
                backgroundColor: miceHere.length === 1 ? PLAYER_BG[miceHere[0]] : undefined,
              }}
            >
              {miceHere.length === 2 ? (
                // Both mice on same cell
                <span className="text-purple-400">X</span>
              ) : miceHere.length === 1 ? (
                <span style={{ color: PLAYER_COLORS[miceHere[0]] }}>
                  {FACING_ARROWS[game.players[miceHere[0]].mouse.facing]}
                </span>
              ) : isEntrance ? (
                <span className="text-yellow-500/80">S</span>
              ) : isExit ? (
                <span className="text-emerald-400">E</span>
              ) : null}
            </div>
          )
        })
      )}
    </div>
  )
}
