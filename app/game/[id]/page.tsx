'use client'

import { useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useGame, useJoinGame } from '../../hooks/useGame'
import { MazeRenderer } from '../../components/MazeRenderer'
import { StrategyForm } from '../../components/StrategyForm'

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
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-400 mt-4">Loading game...</p>
      </div>
    )
  }

  // Error state
  if (error) {
    const isNotFound = error.message === 'Game not found'
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
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
    <div className="max-w-5xl mx-auto px-6 py-6">
      {/* Status Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-zinc-500 font-mono text-sm">{gameId}</span>
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            game.status === 'WAITING' ? 'bg-yellow-900/50 text-yellow-400' :
            game.status === 'PLAYING' ? 'bg-emerald-900/50 text-emerald-400' :
            'bg-zinc-800 text-zinc-400'
          }`}>
            {game.status}
          </span>
        </div>
        <span className={`flex items-center gap-2 text-sm ${connected ? 'text-emerald-400' : 'text-yellow-400'}`}>
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-yellow-400'} animate-pulse`} />
          {connected ? 'Live' : 'Connecting...'}
        </span>
      </div>

      {/* Progress bar */}
      {game.status !== 'WAITING' && (
        <div className="mb-6">
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
        <div className="bg-zinc-900/30 rounded-xl p-4 border border-zinc-800">
          <MazeRenderer game={game} size="lg" />
        </div>
      </div>

      {/* Join Form - shown alone when joining */}
      {canJoin && (
        <div className="max-w-md mx-auto mb-6">
          <StrategyForm
            title="Your Mouse"
            name={playerName}
            setName={setPlayerName}
            prompt={prompt}
            setPrompt={setPrompt}
            onSubmit={handleJoin}
            submitLabel="Join Game"
            submitting={joinGame.isPending}
            error={joinGame.error?.message}
            namePlaceholder="Player 2"
          />
        </div>
      )}

      {/* Player Cards - shown during game or waiting */}
      {!canJoin && (
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

          {/* Opponent card or waiting */}
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
          ) : isPlayer ? (
            <div className="p-4 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/30 flex flex-col items-center justify-center text-center">
              <p className="text-zinc-400 mb-3">Waiting for opponent...</p>
              <ShareLink gameId={gameId} />
            </div>
          ) : null}
        </div>
      )}

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
  )
}
