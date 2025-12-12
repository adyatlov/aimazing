'use client'

import type { MazePreview } from '../hooks/useGame'

interface MazePreviewProps {
  maze: MazePreview
  size?: 'sm' | 'md' | 'lg'
}

export function MazePreviewRenderer({ maze, size = 'md' }: MazePreviewProps) {
  const mazeSize = maze.maze.length

  const cellSize = 16
  const fontSize = size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'

  return (
    <div
      className="grid gap-0 border border-zinc-700 rounded-lg overflow-hidden bg-zinc-900"
      style={{
        gridTemplateColumns: `repeat(${mazeSize}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${mazeSize}, ${cellSize}px)`,
      }}
    >
      {maze.maze.map((row, y) =>
        row.map((cell, x) => {
          const isWall = cell === 'WALL'
          const isEntrance = maze.entrance.x === x && maze.entrance.y === y
          const isExit = maze.exit.x === x && maze.exit.y === y

          let bgColor = isWall ? 'bg-zinc-800' : 'bg-zinc-950'
          if (isEntrance) bgColor = 'bg-yellow-900/30'
          if (isExit) bgColor = 'bg-emerald-900/40'

          return (
            <div
              key={`${x}-${y}`}
              className={`flex items-center justify-center ${fontSize} font-bold ${bgColor} border-zinc-800/50 border-[0.5px]`}
              style={{ width: cellSize, height: cellSize }}
            >
              {isEntrance ? (
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
