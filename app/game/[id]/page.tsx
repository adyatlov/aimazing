'use client'

import { useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useGame, useJoinGame } from '../../hooks/useGame'
import { MazeRenderer } from '../../components/MazeRenderer'

const PRESET_STRATEGIES = [
  {
    name: 'Right-hand rule',
    prompt: 'Follow the right-hand rule: if right is clear, turn right and move forward. Otherwise if front is clear, move forward. Otherwise turn left.',
  },
  {
    name: 'Left-hand rule',
    prompt: 'Follow the left-hand rule: if left is clear, turn left and move forward. Otherwise if front is clear, move forward. Otherwise turn right.',
  },
  {
    name: 'Explorer',
    prompt: 'Prefer unexplored paths. If multiple options, choose the one you have visited least. Avoid backtracking unless necessary.',
  },
  {
    name: 'Random walker',
    prompt: 'Move randomly but avoid hitting walls. If stuck, turn around.',
  },
]

function ShareLink({ gameId }: { gameId: string }) {
  const [copied, setCopied] = useState(false)
  const gameUrl = typeof window !== 'undefined' ? window.location.href : ''

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(gameUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const input = document.createElement('input')
      input.value = gameUrl
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [gameUrl])

  return (
    <div className="flex gap-2">
      <input
        type="text"
        readOnly
        value={gameUrl}
        className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 font-mono truncate"
      />
      <button
        onClick={handleCopy}
        className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
          copied ? 'bg-emerald-600 text-white' : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200'
        }`}
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  )
}

function isFinished(status: string): boolean {
  return status === 'CREATOR_WIN' || status === 'OPPONENT_WIN' || status === 'DRAW'
}

export default function GamePage() {
  const params = useParams()
  const gameId = params.id as string

  const { game, connected, error, isPlayer } = useGame(gameId)
  const joinGame = useJoinGame()

  const [playerName, setPlayerName] = useState('')
  const [prompt, setPrompt] = useState('')

  // Can join if: game is waiting, only 1 mouse, and we're not already a player
  const canJoin = game?.status === 'WAITING' && game.mice.length < 2 && !isPlayer

  const handleJoin = async () => {
    if (!prompt.trim()) return
    const name = playerName.trim() || 'Player 2'
    await joinGame.mutateAsync({
      gameId,
      name,
      prompt: prompt.trim(),
    })
  }

  // Loading state
  if (!game && !error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-400 mt-4">Loading game...</p>
      </div>
    )
  }

  // Error state
  if (error) {
    const isNotFound = error.message === 'Game not found'
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="text-center">
          {isNotFound ? (
            <>
              <p className="text-6xl font-bold text-zinc-600 mb-2">404</p>
              <p className="text-xl text-zinc-400 mb-1">Game not found</p>
              <p className="text-zinc-500 mb-6 font-mono">{gameId}</p>
            </>
          ) : (
            <p className="text-red-400 mb-4">Failed to load game</p>
          )}
          <Link href="/" className="text-emerald-400 hover:underline">
            Back to games
          </Link>
        </div>
      </div>
    )
  }

  if (!game) return null

  const finished = isFinished(game.status)
  const progress = Math.round((game.turn / game.maxTurns) * 100)

  const creator = game.mice[0]
  const opponent = game.mice[1]

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Link href="/" className="text-zinc-400 hover:text-zinc-300 text-sm">
            ← Back
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-zinc-500 font-mono text-sm">{gameId}</span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              game.status === 'WAITING' ? 'bg-yellow-900/50 text-yellow-400' :
              game.status === 'PLAYING' ? 'bg-emerald-900/50 text-emerald-400' :
              'bg-zinc-800 text-zinc-400'
            }`}>
              {game.status}
            </span>
            <span className={`flex items-center gap-2 text-sm ${connected ? 'text-emerald-400' : 'text-yellow-400'}`}>
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-yellow-400'} animate-pulse`} />
            </span>
          </div>
        </div>

        {/* Progress bar (when playing/finished) */}
        {game.status !== 'WAITING' && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-zinc-500 mb-1">
              <span>Turn {game.turn}</span>
              <span>{game.maxTurns} max</span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${finished ? 'bg-zinc-600' : 'bg-emerald-500'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Maze */}
        <div className="flex justify-center mb-6">
          <MazeRenderer game={game} size="lg" />
        </div>

        {/* Player Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Creator card */}
          {creator && (
            <div className={`p-4 rounded-xl border ${
              game.status === 'CREATOR_WIN' ? 'bg-emerald-900/20 border-emerald-600' :
              'bg-zinc-900/50 border-zinc-800'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 rounded-full bg-green-500" />
                <span className="font-semibold">{creator.name}</span>
                {isPlayer && game.myPrompt && <span className="text-xs text-emerald-400">(You)</span>}
              </div>
              {isPlayer && game.myPrompt ? (
                <p className="text-xs text-zinc-400 line-clamp-2 mb-3">{game.myPrompt}</p>
              ) : (
                <p className="text-xs text-zinc-600 italic mb-3">Strategy hidden</p>
              )}
              <div className="flex items-center gap-4 text-xs text-zinc-500">
                <span>Pos: ({creator.position.x}, {creator.position.y})</span>
                <span>Facing: {creator.facing}</span>
              </div>
            </div>
          )}

          {/* Opponent card or waiting/join */}
          {opponent ? (
            <div className={`p-4 rounded-xl border ${
              game.status === 'OPPONENT_WIN' ? 'bg-emerald-900/20 border-emerald-600' :
              'bg-zinc-900/50 border-zinc-800'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="font-semibold">{opponent.name}</span>
              </div>
              <p className="text-xs text-zinc-600 italic mb-3">Strategy hidden</p>
              <div className="flex items-center gap-4 text-xs text-zinc-500">
                <span>Pos: ({opponent.position.x}, {opponent.position.y})</span>
                <span>Facing: {opponent.facing}</span>
              </div>
            </div>
          ) : canJoin ? (
            <div className="p-4 rounded-xl border bg-zinc-900/50 border-zinc-800">
              <h3 className="font-semibold mb-3">Join Game</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Your name (optional)"
                  maxLength={20}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe your AI strategy..."
                  maxLength={500}
                  rows={2}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 resize-none"
                />
                <div className="flex flex-wrap gap-1">
                  {PRESET_STRATEGIES.map((s) => (
                    <button
                      key={s.name}
                      onClick={() => setPrompt(s.prompt)}
                      className="px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleJoin}
                  disabled={joinGame.isPending || !prompt.trim()}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                >
                  {joinGame.isPending ? 'Joining...' : 'Join Game'}
                </button>
                {joinGame.error && (
                  <p className="text-red-400 text-xs">{joinGame.error.message}</p>
                )}
              </div>
            </div>
          ) : isPlayer ? (
            <div className="p-4 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/30 flex flex-col items-center justify-center text-center">
              <p className="text-zinc-400 mb-3">Waiting for opponent...</p>
              <ShareLink gameId={gameId} />
            </div>
          ) : null}
        </div>

        {/* Result Banner */}
        {finished && (
          <div className="flex flex-col items-center gap-4 p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800">
            <div className="text-3xl font-bold">
              {game.status === 'CREATOR_WIN' && (
                <span className="text-green-400">{creator?.name} Wins!</span>
              )}
              {game.status === 'OPPONENT_WIN' && (
                <span className="text-blue-400">{opponent?.name} Wins!</span>
              )}
              {game.status === 'DRAW' && (
                <span className="text-yellow-400">It&apos;s a Draw!</span>
              )}
            </div>
            <p className="text-zinc-400">Finished in {game.turn} turns</p>
            <Link
              href="/"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-8 rounded-xl transition-colors"
            >
              Back to Games
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
