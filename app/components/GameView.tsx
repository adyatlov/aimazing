'use client'

import { useGame } from '../hooks/useGame'
import { MazeRenderer } from './MazeRenderer'

interface GameViewProps {
  gameId: string
  onNewGame: () => void
}

export function GameView({ gameId, onNewGame }: GameViewProps) {
  const { data: game, isLoading, error } = useGame(gameId)

  if (isLoading && !game) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-400">Loading game...</p>
      </div>
    )
  }

  if (error || !game) {
    return (
      <div className="flex flex-col items-center gap-4 p-8 bg-zinc-900/50 rounded-2xl border border-zinc-800">
        <p className="text-red-400">Failed to load game</p>
        <button
          onClick={onNewGame}
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold py-2 px-6 rounded-xl transition-colors"
        >
          New Game
        </button>
      </div>
    )
  }

  const isPlaying = game.status === 'PLAYING'
  const isFinished = game.status === 'FINISHED'
  const progress = Math.round((game.turn / game.maxTurns) * 100)

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-4xl">
      {/* Header */}
      <div className="flex flex-col items-center gap-3 w-full">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">AI Maze Battle</h1>
          {isPlaying && (
            <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/50 text-emerald-400 text-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-md">
          <div className="flex justify-between text-xs text-zinc-500 mb-1">
            <span>Turn {game.turn}</span>
            <span>{game.maxTurns} max</span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isFinished ? 'bg-zinc-600' : 'bg-emerald-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Maze */}
      <MazeRenderer game={game} size="lg" />

      {/* Player Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        {game.players.map((player, index) => {
          const isWinner = game.result === (index === 0 ? 'PLAYER1_WIN' : 'PLAYER2_WIN')
          const color = index === 0 ? 'green' : 'blue'

          return (
            <div
              key={player.id}
              className={`p-4 rounded-xl border transition-all ${
                isWinner
                  ? 'bg-emerald-900/20 border-emerald-600'
                  : 'bg-zinc-900/50 border-zinc-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-3 h-3 rounded-full ${
                      index === 0 ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                  />
                  <span className="font-semibold">{player.name}</span>
                </div>
                {isWinner && (
                  <span className="text-emerald-400 text-sm font-medium">Winner!</span>
                )}
              </div>

              <p className="text-xs text-zinc-500 line-clamp-2 mb-3">{player.prompt}</p>

              <div className="flex items-center gap-4 text-xs text-zinc-400">
                <span>
                  Pos: ({player.mouse.position.x}, {player.mouse.position.y})
                </span>
                <span>Facing: {player.mouse.facing}</span>
                <span>Moves: {player.mouse.actionHistory.length}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Result Banner */}
      {isFinished && (
        <div className="flex flex-col items-center gap-4 p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800 w-full">
          <div className="text-3xl font-bold">
            {game.result === 'PLAYER1_WIN' && (
              <span className="text-green-400">Mouse A Wins!</span>
            )}
            {game.result === 'PLAYER2_WIN' && (
              <span className="text-blue-400">Mouse B Wins!</span>
            )}
            {game.result === 'DRAW' && (
              <span className="text-yellow-400">It&apos;s a Draw!</span>
            )}
          </div>
          <p className="text-zinc-400">
            Finished in {game.turn} turns
          </p>
          <button
            onClick={onNewGame}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-8 rounded-xl transition-colors"
          >
            New Battle
          </button>
        </div>
      )}
    </div>
  )
}
