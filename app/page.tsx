'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useGameList } from './hooks/useGameList'
import { useCreateGame } from './hooks/useGame'

export default function Home() {
  const router = useRouter()
  const [showFinished, setShowFinished] = useState(false)
  const { games, connected } = useGameList(showFinished)
  const createGame = useCreateGame()

  const handleCreateGame = async () => {
    const result = await createGame.mutateAsync({})
    router.push(`/game/${result.gameId}`)
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-8">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent">
            AImazing
          </h1>
          <p className="text-zinc-400 text-lg">
            AI-powered mice battle through the maze
          </p>
        </div>

        {/* Create Game Button */}
        <div className="flex justify-center mb-8">
          <button
            onClick={handleCreateGame}
            disabled={createGame.isPending}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-semibold py-3 px-8 rounded-xl transition-colors"
          >
            {createGame.isPending ? 'Creating...' : 'Create New Game'}
          </button>
        </div>

        {/* Connection Status */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Games</h2>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={showFinished}
                onChange={(e) => setShowFinished(e.target.checked)}
                className="rounded"
              />
              Show finished
            </label>
            <span className={`flex items-center gap-2 text-sm ${connected ? 'text-emerald-400' : 'text-yellow-400'}`}>
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-yellow-400'} animate-pulse`} />
              {connected ? 'Live' : 'Connecting...'}
            </span>
          </div>
        </div>

        {/* Game List */}
        {games.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            No games yet. Create one to get started!
          </div>
        ) : (
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
                    {game.playerCount}/2 players
                  </span>
                </div>

                {game.playerNames.length > 0 && (
                  <div className="mt-2 text-sm text-zinc-400">
                    Players: {game.playerNames.join(' vs ')}
                  </div>
                )}

                {game.status === 'PLAYING' && (
                  <div className="mt-2 text-xs text-zinc-500">
                    Turn {game.turn}/{game.maxTurns}
                  </div>
                )}

                {game.status === 'FINISHED' && game.result && (
                  <div className="mt-2 text-xs text-zinc-400">
                    Result: {game.result === 'DRAW' ? 'Draw' :
                      `${game.playerNames[game.result === 'PLAYER1_WIN' ? 0 : 1]} wins!`}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
