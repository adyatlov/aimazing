'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCreateGame } from '../../hooks/useGame'

const MAZE_SIZES = [
  { value: 11, label: 'Small', desc: '11x11' },
  { value: 15, label: 'Medium', desc: '15x15' },
  { value: 21, label: 'Large', desc: '21x21' },
  { value: 31, label: 'Huge', desc: '31x31' },
]

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

export default function NewGamePage() {
  const router = useRouter()
  const createGame = useCreateGame()

  const [mazeSize, setMazeSize] = useState(15)
  const [playerName, setPlayerName] = useState('')
  const [playerPrompt, setPlayerPrompt] = useState('')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!playerPrompt.trim()) return

    const name = playerName.trim() || 'Player 1'
    const result = await createGame.mutateAsync({
      mazeSize,
      name,
      prompt: playerPrompt.trim(),
    })
    router.push(`/game/${result.gameId}`)
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-8">
      <h2 className="text-2xl font-bold text-center mb-8">Create New Game</h2>

      <form onSubmit={handleCreate} className="space-y-6">
        {/* Maze Size */}
        <div>
          <label className="block text-sm text-zinc-400 mb-3">Maze Size</label>
          <div className="grid grid-cols-4 gap-2">
            {MAZE_SIZES.map((size) => (
              <button
                key={size.value}
                type="button"
                onClick={() => setMazeSize(size.value)}
                className={`px-4 py-3 rounded-lg text-sm transition-colors ${
                  mazeSize === size.value
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                <div className="font-medium">{size.label}</div>
                <div className="text-xs opacity-70">{size.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Player Name */}
        <div>
          <label className="block text-sm text-zinc-400 mb-1">
            Your Mouse Name <span className="text-zinc-600">(optional)</span>
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Player 1"
            maxLength={20}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Strategy Prompt */}
        <div>
          <label className="block text-sm text-zinc-400 mb-1">AI Strategy Prompt</label>
          <textarea
            value={playerPrompt}
            onChange={(e) => setPlayerPrompt(e.target.value)}
            placeholder="Describe how your AI mouse should navigate the maze..."
            maxLength={500}
            rows={4}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 resize-none"
          />
          <div className="mt-2">
            <span className="text-xs text-zinc-500">Or pick a preset:</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {PRESET_STRATEGIES.map((strategy) => (
                <button
                  key={strategy.name}
                  type="button"
                  onClick={() => setPlayerPrompt(strategy.prompt)}
                  className="px-3 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                >
                  {strategy.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={createGame.isPending || !playerPrompt.trim()}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white font-semibold py-4 px-8 rounded-xl transition-colors text-lg"
        >
          {createGame.isPending ? 'Creating...' : 'Create Game'}
        </button>

        {createGame.error && (
          <p className="text-red-400 text-sm text-center">{createGame.error.message}</p>
        )}
      </form>
    </div>
  )
}
