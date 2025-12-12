import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import type { RouterClient } from '@orpc/server'
import type { Router } from '../server/router'

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001'

const link = new RPCLink({
  url: `${SERVER_URL}/rpc`,
})

export const client: RouterClient<Router> = createORPCClient(link)

export function getWebSocketUrl(): string {
  const url = new URL(SERVER_URL)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return url.toString().replace(/\/$/, '')
}

export type { GameResponse, GameListItem } from '../server/router'
