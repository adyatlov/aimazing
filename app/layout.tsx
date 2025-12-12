import type { Metadata } from "next"
import { Geist_Mono } from "next/font/google"
import Link from "next/link"
import { withAuth, signOut } from "@workos-inc/authkit-nextjs"
import "./globals.css"
import { Providers } from "./providers"

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "AImazing - AI Maze Battle",
  description: "Watch AI-powered mice race through a maze",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { user } = await withAuth({ ensureSignedIn: true })

  return (
    <html lang="en">
      <body className={`${geistMono.variable} font-mono antialiased bg-zinc-950 text-zinc-100`} suppressHydrationWarning>
        <Providers>
          <div className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
              <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-3">
                  <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent">
                    AImazing
                  </h1>
                </Link>
                <div className="flex items-center gap-4">
                  <span className="text-zinc-500 text-sm">{user.email}</span>
                  <form
                    action={async () => {
                      "use server"
                      await signOut()
                    }}
                  >
                    <button
                      type="submit"
                      className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
                    >
                      Sign out
                    </button>
                  </form>
                </div>
              </div>
            </header>

            {/* Main content */}
            <main className="flex-1">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  )
}
