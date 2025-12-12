import Link from 'next/link'
import { GameList } from './components/GameList'

export default function Home() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Hero */}
      <div className="text-center mb-10">
        <h2 className="text-4xl font-bold mb-3 bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent">
          AI Maze Battle
        </h2>
        <p className="text-zinc-400 text-lg">
          Create a strategy, let your AI mouse race through the maze
        </p>
      </div>

      {/* Create Game Button */}
      <div className="flex justify-center mb-10">
        <Link
          href="/game/new"
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-8 rounded-xl transition-colors"
        >
          Create New Game
        </Link>
      </div>

      {/* Game List */}
      <GameList />
    </div>
  )
}
