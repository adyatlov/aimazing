'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useGame, useJoinGame, getPlayerSecret } from '../../hooks/useGame'
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

export default function GamePage() {
  const params = useParams()
  const gameId = params.id as string

  const { game, connected, error, isPlayer } = useGame(gameId)
  const joinGame = useJoinGame()

  const [playerName, setPlayerName] = useState('')
  const [prompt, setPrompt] = useState('')

  const canJoin = game?.status === 'WAITING' && game.players.length < 2 && !isPlayer

  const handleJoin = async () => {
    if (!playerName.trim() || !prompt.trim()) return
    await joinGame.mutateAsync({
      gameId,
      name: playerName.trim(),
      prompt: prompt.trim(),
    })
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="text-center">
          <p className="text-red-400 mb-4">Failed to load game</p>
          <Link href="/" className="text-emerald-400 hover:underline">
            Back to games
          </Link>
        </div>
      </div>
    )
  }

  if (!game) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-400 mt-4">Loading game...</p>
      </div>
    )
  }

  const isPlaying = game.status === 'PLAYING'
  const isFinished = game.status === 'FINISHED'
  const progress = Math.round((game.turn / game.maxTurns) * 100)

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="text-zinc-400 hover:text-zinc-300 text-sm">
            ← Back to games
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-zinc-500 font-mono text-sm">{gameId}</span>
            <span className={`flex items-center gap-2 text-sm ${connected ? 'text-emerald-400' : 'text-yellow-400'}`}>
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-yellow-400'} animate-pulse`} />
              {connected ? 'Live' : 'Connecting...'}
            </span>
          </div>
        </div>

        {/* Game Status */}
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold">AI Maze Battle</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              game.status === 'WAITING' ? 'bg-yellow-900/50 text-yellow-400' :
              game.status === 'PLAYING' ? 'bg-emerald-900/50 text-emerald-400' :
              'bg-zinc-800 text-zinc-400'
            }`}>
              {game.status}
            </span>
          </div>

          {/* Progress bar */}
          {game.status !== 'WAITING' && (
            <div className="w-full max-w-md">
              <div className="flex justify-between text-xs text-zinc-500 mb-1">
                <span>Turn {game.turn}</span>
                <span>{game.maxTurns} max</span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${isFinished ? 'bg-zinc-600' : 'bg-emerald-500'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Join Form (if waiting and can join) */}
        {canJoin && (
          <div className="mb-8 p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800">
            <h2 className="text-xl font-semibold mb-4">Join Game</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Your Name</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  maxLength={20}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">AI Strategy Prompt</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe how your AI mouse should navigate..."
                  maxLength={500}
                  rows={3}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Or pick a preset:</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_STRATEGIES.map((strategy) => (
                    <button
                      key={strategy.name}
                      onClick={() => setPrompt(strategy.prompt)}
                      className="px-3 py-1 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                    >
                      {strategy.name}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleJoin}
                disabled={joinGame.isPending || !playerName.trim() || !prompt.trim()}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
              >
                {joinGame.isPending ? 'Joining...' : 'Join Game'}
              </button>

              {joinGame.error && (
                <p className="text-red-400 text-sm">{joinGame.error.message}</p>
              )}
            </div>
          </div>
        )}

        {/* Waiting for players message */}
        {game.status === 'WAITING' && !canJoin && (
          <div className="mb-8 p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800 text-center">
            <p className="text-zinc-400">
              {game.players.length === 0
                ? 'Waiting for players to join...'
                : game.players.length === 1
                ? `Waiting for opponent... (${game.players[0].name} has joined)`
                : 'Game starting...'}
            </p>
            <p className="text-zinc-500 text-sm mt-2">
              Share this link: <span className="text-emerald-400 font-mono">{typeof window !== 'undefined' ? window.location.href : ''}</span>
            </p>
          </div>
        )}

        {/* Maze */}
        {game.players.length > 0 && (
          <div className="flex justify-center mb-6">
            <MazeRenderer game={game} size="lg" />
          </div>
        )}

        {/* Player Cards */}
        {game.players.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {game.players.map((player, index) => {
              const isWinner = game.result === (index === 0 ? 'PLAYER1_WIN' : 'PLAYER2_WIN')
              const hasPrompt = player.prompt !== undefined

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
                      <span className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-green-500' : 'bg-blue-500'}`} />
                      <span className="font-semibold">{player.name}</span>
                      {hasPrompt && <span className="text-xs text-emerald-400">(You)</span>}
                    </div>
                    {isWinner && <span className="text-emerald-400 text-sm font-medium">Winner!</span>}
                  </div>

                  {hasPrompt ? (
                    <p className="text-xs text-zinc-400 line-clamp-2 mb-3">{player.prompt}</p>
                  ) : (
                    <p className="text-xs text-zinc-600 italic mb-3">Strategy hidden</p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-zinc-500">
                    <span>Pos: ({player.mouse.position.x}, {player.mouse.position.y})</span>
                    <span>Facing: {player.mouse.facing}</span>
                    <span>Moves: {player.mouse.actionHistory.length}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Result Banner */}
        {isFinished && (
          <div className="flex flex-col items-center gap-4 p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800">
            <div className="text-3xl font-bold">
              {game.result === 'PLAYER1_WIN' && (
                <span className="text-green-400">{game.players[0]?.name} Wins!</span>
              )}
              {game.result === 'PLAYER2_WIN' && (
                <span className="text-blue-400">{game.players[1]?.name} Wins!</span>
              )}
              {game.result === 'DRAW' && (
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
