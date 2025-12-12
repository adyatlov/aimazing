import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import type { RouterClient } from '@orpc/server'
import type { Router } from '../server/router'

// Server URL - configured via environment variable
const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001'

const link = new RPCLink({
  url: () => `${SERVER_URL}/rpc`,
  headers: () => ({
    'Content-Type': 'application/json',
  }),
})

export const client: RouterClient<Router> = createORPCClient(link)

// WebSocket URL for real-time updates
export function getWebSocketUrl(): string {
  const url = new URL(SERVER_URL)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return url.toString().replace(/\/$/, '')
}

export type { Router }
export type { SerializedGame, GameListItem } from '../server/router'
