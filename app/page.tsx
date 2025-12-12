'use client'

import { useState } from 'react'
import { GameSetup } from './components/GameSetup'
import { GameView } from './components/GameView'

export default function Home() {
  const [activeGameId, setActiveGameId] = useState<string | null>(null)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8">
      {activeGameId ? (
        <GameView
          gameId={activeGameId}
          onNewGame={() => setActiveGameId(null)}
        />
      ) : (
        <div className="flex flex-col items-center gap-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent">
              AImazing
            </h1>
            <p className="text-zinc-400 text-lg">
              AI-powered mice battle through the maze
            </p>
          </div>
          <GameSetup onGameReady={setActiveGameId} />
        </div>
      )}
    </div>
  )
}
