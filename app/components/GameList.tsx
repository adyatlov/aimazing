'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useGameList } from '../hooks/useGameList'

function isFinished(status: string): boolean {
  return status === 'CREATOR_WIN' || status === 'OPPONENT_WIN' || status === 'DRAW'
}

export function GameList() {
  const [showFinished, setShowFinished] = useState(false)
  const { games, connected } = useGameList(showFinished)

  if (games.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-500">
        No games yet. Create one to get started!
      </div>
    )
  }

  return (
    <>
      {/* Header with filters */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Games</h2>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
            <button
              role="switch"
              aria-checked={showFinished}
              onClick={() => setShowFinished(!showFinished)}
              className={`relative w-10 h-5 rounded-full transition-colors ${showFinished ? 'bg-emerald-600' : 'bg-zinc-700'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${showFinished ? 'translate-x-5' : ''}`} />
            </button>
            Show finished
          </label>
          <span className={`flex items-center gap-2 text-sm ${connected ? 'text-emerald-400' : 'text-yellow-400'}`}>
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-yellow-400'} animate-pulse`} />
            {connected ? 'Live' : 'Connecting...'}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {games.map((game) => (
          <Link
            key={game.id}
            href={`/game/${game.id}`}
            className="block p-4 bg-zinc-900/50 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  game.status === 'WAITING' ? 'bg-yellow-900/50 text-yellow-400' :
                  game.status === 'PLAYING' ? 'bg-emerald-900/50 text-emerald-400' :
                  'bg-zinc-800 text-zinc-400'
                }`}>
                  {game.status}
                </span>
                <span className="text-zinc-300 font-mono">{game.id}</span>
              </div>
              <span className="text-zinc-500 text-sm">
                {game.opponentName ? '2/2' : '1/2'} players
              </span>
            </div>

            <div className="mt-2 text-sm text-zinc-400">
              {game.creatorName}{game.opponentName ? ` vs ${game.opponentName}` : ''}
            </div>

            {game.status === 'PLAYING' && (
              <div className="mt-2 text-xs text-zinc-500">
                Turn {game.turn}/{game.maxTurns}
              </div>
            )}

            {isFinished(game.status) && (
              <div className="mt-2 text-xs text-zinc-400">
                {game.status === 'DRAW' ? 'Draw' :
                  game.status === 'CREATOR_WIN' ? `${game.creatorName} wins!` :
                  `${game.opponentName} wins!`}
              </div>
            )}
          </Link>
        ))}
      </div>
    </>
  )
}
