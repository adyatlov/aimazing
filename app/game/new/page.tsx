'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCreateGame, usePreviewMaze } from '../../hooks/useGame'
import { MazePreviewRenderer } from '../../components/MazePreview'
import { StrategyForm } from '../../components/StrategyForm'

const MAZE_SIZES = [
  { value: 11, label: 'S' },
  { value: 15, label: 'M' },
  { value: 21, label: 'L' },
  { value: 31, label: 'XL' },
]

export default function NewGamePage() {
  const router = useRouter()
  const createGame = useCreateGame()
  const { maze, loading: mazeLoading, generate } = usePreviewMaze()

  const [mazeSize, setMazeSize] = useState(15)
  const [playerName, setPlayerName] = useState('')
  const [playerPrompt, setPlayerPrompt] = useState('')

  useEffect(() => {
    generate(mazeSize)
  }, [mazeSize, generate])

  const handleCreate = async () => {
    if (!playerPrompt.trim() || !maze) return

    const name = playerName.trim() || 'Player 1'
    const result = await createGame.mutateAsync({
      maze,
      name,
      prompt: playerPrompt.trim(),
    })
    router.push(`/game/${result.gameId}`)
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-6">
      {/* Status Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="px-2 py-1 rounded text-xs font-medium bg-blue-900/50 text-blue-400">
            NEW GAME
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Size:</span>
          {MAZE_SIZES.map((size) => (
            <button
              key={size.value}
              type="button"
              onClick={() => setMazeSize(size.value)}
              className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                mazeSize === size.value
                  ? 'bg-emerald-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {size.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => generate(mazeSize)}
            disabled={mazeLoading}
            title="Generate new maze"
            className="w-7 h-7 flex items-center justify-center rounded bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 disabled:opacity-50 transition-colors ml-1"
          >
            <svg className={`w-4 h-4 ${mazeLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Maze */}
      <div className="flex justify-center mb-6">
        <div className="bg-zinc-900/30 rounded-xl p-4 border border-zinc-800">
          {maze ? (
            <MazePreviewRenderer maze={maze} size="lg" />
          ) : (
            <div className="w-[400px] h-[400px] flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Player Setup */}
        <StrategyForm
          title="Your Mouse"
          name={playerName}
          setName={setPlayerName}
          prompt={playerPrompt}
          setPrompt={setPlayerPrompt}
          onSubmit={handleCreate}
          submitLabel="Create Game"
          submitting={createGame.isPending}
          error={createGame.error?.message}
          namePlaceholder="Player 1"
        />

        {/* Instructions */}
        <div className="p-4 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/30 flex flex-col justify-center">
          <h3 className="font-semibold mb-2 text-zinc-400">How to Play</h3>
          <ul className="text-xs text-zinc-500 space-y-1.5">
            <li>• Choose a maze size and regenerate until you like it</li>
            <li>• Write a strategy prompt for your AI mouse</li>
            <li>• Share the game link with a friend to challenge them</li>
            <li>• First mouse to reach the exit wins!</li>
          </ul>
          <div className="mt-4 pt-3 border-t border-zinc-800">
            <p className="text-xs text-zinc-600">
              <span className="text-yellow-500">S</span> = Start · <span className="text-emerald-400">E</span> = Exit
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
