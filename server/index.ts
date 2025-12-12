import 'dotenv/config'
import { createServer } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { RPCHandler } from '@orpc/server/fetch'
import {
  router,
  subscribeToGame,
  unsubscribeFromGame,
  subscribeToGameList,
  unsubscribeFromGameList,
  type GameResponse,
  type GameListItem,
} from './router'

const PORT = process.env.PORT || 3001
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000'

// oRPC handler
const rpcHandler = new RPCHandler(router)

// HTTP server
const server = createServer(async (req, res) => {
  const start = Date.now()

  console.log(`→ ${req.method} ${req.url}`)

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN)
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    console.log(`← 200 OPTIONS (${Date.now() - start}ms)`)
    res.writeHead(200)
    res.end()
    return
  }

  // Health check
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok' }))
    return
  }

  // Handle oRPC requests
  if (req.url?.startsWith('/rpc')) {
    try {
      const protocol = 'http'
      const host = req.headers.host || 'localhost'
      const url = new URL(req.url, `${protocol}://${host}`)

      const body = await new Promise<string>((resolve) => {
        let data = ''
        req.on('data', chunk => data += chunk)
        req.on('end', () => resolve(data))
      })

      const request = new Request(url.toString(), {
        method: req.method,
        headers: req.headers as Record<string, string>,
        body: req.method !== 'GET' && req.method !== 'HEAD' ? body : undefined,
      })

      const { response } = await rpcHandler.handle(request, {
        prefix: '/rpc',
        context: {},
      })

      if (response) {
        console.log(`← ${response.status} RPC (${Date.now() - start}ms)`)
        res.writeHead(response.status, Object.fromEntries(response.headers.entries()))
        res.end(await response.text())
      } else {
        console.log(`← 404 RPC not found (${Date.now() - start}ms)`)
        res.writeHead(404)
        res.end('Not found')
      }
    } catch (error) {
      console.error(`← 500 RPC error (${Date.now() - start}ms):`, error)
      res.writeHead(500)
      res.end('Internal server error')
    }
    return
  }

  console.log(`← 404 Not found (${Date.now() - start}ms)`)
  res.writeHead(404)
  res.end('Not found')
})

// WebSocket server
const wss = new WebSocketServer({
  server,
  verifyClient: (info, callback) => {
    const origin = info.origin || info.req.headers.origin
    if (!origin || origin === CORS_ORIGIN || origin === 'http://localhost:3000') {
      callback(true)
    } else {
      console.log('Rejected WebSocket from origin:', origin)
      callback(false, 403, 'Forbidden')
    }
  }
})

wss.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`FATAL: Port ${PORT} is already in use!`)
  } else {
    console.error(`FATAL: WebSocket server error:`, err.message)
  }
  process.exit(1)
})

wss.on('connection', (ws: WebSocket) => {
  console.log('⚡ WebSocket connected')

  let subscribedGameId: string | null = null
  let isSubscribedToList = false
  let gameCallback: ((game: GameResponse) => void) | null = null
  let listCallback: ((games: GameListItem[]) => void) | null = null

  ws.on('message', (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString())
      console.log('⚡ WS message:', message.type)

      // Subscribe to game list updates
      if (message.type === 'subscribeList' && message.userId) {
        if (!isSubscribedToList) {
          listCallback = (games: GameListItem[]) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'gameList', games }))
            }
          }
          subscribeToGameList(message.userId, listCallback)
          isSubscribedToList = true
        }
      }

      // Unsubscribe from game list
      if (message.type === 'unsubscribeList') {
        if (isSubscribedToList && listCallback) {
          unsubscribeFromGameList(listCallback)
          isSubscribedToList = false
          listCallback = null
        }
      }

      // Subscribe to a specific game
      if (message.type === 'subscribeGame' && message.gameId) {
        // Unsubscribe from previous game if any
        if (subscribedGameId && gameCallback) {
          unsubscribeFromGame(subscribedGameId, gameCallback)
        }

        subscribedGameId = message.gameId
        const playerId = message.playerId

        gameCallback = (game: GameResponse) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'gameUpdate', game }))
          }
        }

        const subscribed = subscribeToGame(message.gameId, gameCallback, playerId)
        if (!subscribed) {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'gameNotFound', gameId: message.gameId }))
          }
          subscribedGameId = null
          gameCallback = null
        }
      }

      // Unsubscribe from game
      if (message.type === 'unsubscribeGame') {
        if (subscribedGameId && gameCallback) {
          unsubscribeFromGame(subscribedGameId, gameCallback)
          subscribedGameId = null
          gameCallback = null
        }
      }
    } catch (e) {
      console.error('Failed to parse WebSocket message:', e)
    }
  })

  ws.on('close', () => {
    console.log('⚡ WebSocket disconnected')
    if (subscribedGameId && gameCallback) {
      unsubscribeFromGame(subscribedGameId, gameCallback)
    }
    if (isSubscribedToList && listCallback) {
      unsubscribeFromGameList(listCallback)
    }
  })
})

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`FATAL: Port ${PORT} is already in use!`)
  } else {
    console.error(`FATAL: Server error:`, err.message)
  }
  process.exit(1)
})

server.listen(PORT, () => {
  console.log('')
  console.log('🎮 AImazing Game Server')
  console.log('========================')
  console.log(`HTTP:      http://localhost:${PORT}`)
  console.log(`WebSocket: ws://localhost:${PORT}`)
  console.log(`CORS:      ${CORS_ORIGIN}`)
  console.log('')
})
