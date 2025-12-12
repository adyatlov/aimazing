'use client'

import { useState } from 'react'
import { useCreateGame, useJoinGame, useStartGame } from '../hooks/useGame'
import { MazeRenderer } from './MazeRenderer'
import type { SerializedGame } from '../../api/router'

interface GameSetupProps {
  onGameReady: (gameId: string) => void
}

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
    name: 'Always forward',
    prompt: 'Always move forward if possible. If blocked, turn right. If still blocked, turn left.',
  },
  {
    name: 'Random explorer',
    prompt: 'Explore randomly. Sometimes turn left, sometimes turn right, sometimes go forward. Be unpredictable!',
  },
]

export function GameSetup({ onGameReady }: GameSetupProps) {
  const [step, setStep] = useState<'config' | 'players'>('config')
  const [mazeSize, setMazeSize] = useState(15)
  const [game, setGame] = useState<SerializedGame | null>(null)
  const [player1Prompt, setPlayer1Prompt] = useState(PRESET_STRATEGIES[0].prompt)
  const [player2Prompt, setPlayer2Prompt] = useState(PRESET_STRATEGIES[1].prompt)
  const [isStarting, setIsStarting] = useState(false)

  const createGame = useCreateGame()
  const joinGame = useJoinGame()
  const startGame = useStartGame()

  const handleCreateGame = async () => {
    const newGame = await createGame.mutateAsync({ mazeSize })
    setGame(newGame)
    setStep('players')
  }

  const handleStartGame = async () => {
    if (!game || isStarting) return
    setIsStarting(true)

    try {
      // Join both players
      await joinGame.mutateAsync({
        gameId: game.id,
        name: 'Mouse A',
        prompt: player1Prompt,
      })

      const updatedGame = await joinGame.mutateAsync({
        gameId: game.id,
        name: 'Mouse B',
        prompt: player2Prompt,
      })

      // Start the game
      await startGame.mutateAsync(updatedGame.id)

      onGameReady(updatedGame.id)
    } catch (error) {
      console.error('Failed to start game:', error)
      setIsStarting(false)
    }
  }

  if (step === 'config') {
    return (
      <div className="flex flex-col gap-6 p-8 bg-zinc-900/50 rounded-2xl border border-zinc-800 max-w-md w-full">
        <h2 className="text-2xl font-bold text-center">New Battle</h2>

        <div className="flex flex-col gap-3">
          <label className="text-sm text-zinc-400 font-medium">Maze Size</label>
          <div className="grid grid-cols-5 gap-2">
            {[7, 11, 15, 21, 31].map((size) => (
              <button
                key={size}
                onClick={() => setMazeSize(size)}
                className={`py-2 px-3 rounded-lg font-medium transition-colors ${
                  mazeSize === size
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
          <p className="text-xs text-zinc-500">
            {mazeSize}x{mazeSize} maze, ~{Math.floor(mazeSize * mazeSize / 2)} max turns
          </p>
        </div>

        <button
          onClick={handleCreateGame}
          disabled={createGame.isPending}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
        >
          {createGame.isPending ? 'Creating maze...' : 'Create Maze'}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-8 bg-zinc-900/50 rounded-2xl border border-zinc-800 max-w-4xl w-full">
      <h2 className="text-2xl font-bold text-center">Configure Strategies</h2>

      {game && (
        <div className="flex justify-center">
          <MazeRenderer game={game} size="sm" />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Player 1 */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <span className="font-semibold">Mouse A</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {PRESET_STRATEGIES.map((strategy) => (
              <button
                key={strategy.name}
                onClick={() => setPlayer1Prompt(strategy.prompt)}
                className={`text-xs py-1 px-2 rounded transition-colors ${
                  player1Prompt === strategy.prompt
                    ? 'bg-green-600/30 text-green-400 border border-green-600'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-transparent'
                }`}
              >
                {strategy.name}
              </button>
            ))}
          </div>

          <textarea
            value={player1Prompt}
            onChange={(e) => setPlayer1Prompt(e.target.value)}
            rows={4}
            className="bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 focus:outline-none focus:border-green-600 resize-none text-sm"
            placeholder="Enter strategy..."
          />
        </div>

        {/* Player 2 */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="font-semibold">Mouse B</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {PRESET_STRATEGIES.map((strategy) => (
              <button
                key={strategy.name}
                onClick={() => setPlayer2Prompt(strategy.prompt)}
                className={`text-xs py-1 px-2 rounded transition-colors ${
                  player2Prompt === strategy.prompt
                    ? 'bg-blue-600/30 text-blue-400 border border-blue-600'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-transparent'
                }`}
              >
                {strategy.name}
              </button>
            ))}
          </div>

          <textarea
            value={player2Prompt}
            onChange={(e) => setPlayer2Prompt(e.target.value)}
            rows={4}
            className="bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-600 resize-none text-sm"
            placeholder="Enter strategy..."
          />
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => {
            setStep('config')
            setGame(null)
          }}
          className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold py-3 px-6 rounded-xl transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleStartGame}
          disabled={isStarting || !player1Prompt || !player2Prompt}
          className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
        >
          {isStarting ? 'Starting...' : 'Start Battle!'}
        </button>
      </div>
    </div>
  )
}
