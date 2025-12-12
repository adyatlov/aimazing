import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import type { RouterClient } from '@orpc/server'
import type { Router } from './router'

const link = new RPCLink({
  url: () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/rpc`
    }
    return `http://localhost:${process.env.PORT || 3000}/rpc`
  },
  headers: () => ({
    'Content-Type': 'application/json',
  }),
})

export const client: RouterClient<Router> = createORPCClient(link)

export type { Router }
