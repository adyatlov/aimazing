import Link from 'next/link'
import { withAuth, signOut } from '@workos-inc/authkit-nextjs'
import { GameList } from './components/GameList'

export default async function Home() {
  const { user } = await withAuth({ ensureSignedIn: true })

  return (
    <div className="min-h-screen flex flex-col items-center p-8">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent">
              AImazing
            </h1>
            <p className="text-zinc-400 text-lg">
              AI-powered mice battle through the maze
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-zinc-400 text-sm">{user.email}</span>
            <form
              action={async () => {
                'use server'
                await signOut()
              }}
            >
              <button
                type="submit"
                className="text-zinc-500 hover:text-zinc-300 text-sm"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        {/* Create Game Button */}
        <div className="flex justify-center mb-8">
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
    </div>
  )
}
