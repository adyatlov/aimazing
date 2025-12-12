import { createServer } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { RPCHandler } from '@orpc/server/fetch'
import { router, subscribeToGame, unsubscribeFromGame, type SerializedGame } from './router'

const PORT = process.env.PORT || 3001
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000'

// oRPC handler
const rpcHandler = new RPCHandler(router)

// HTTP server
const server = createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN)
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
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
      // Convert Node request to Fetch Request
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
        res.writeHead(response.status, Object.fromEntries(response.headers.entries()))
        res.end(await response.text())
      } else {
        res.writeHead(404)
        res.end('Not found')
      }
    } catch (error) {
      console.error('RPC error:', error)
      res.writeHead(500)
      res.end('Internal server error')
    }
    return
  }

  res.writeHead(404)
  res.end('Not found')
})

// WebSocket server
const wss = new WebSocketServer({ server })

wss.on('connection', (ws: WebSocket) => {
  console.log('WebSocket client connected')
  let subscribedGameId: string | null = null

  ws.on('message', (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString())

      if (message.type === 'subscribe' && message.gameId) {
        // Unsubscribe from previous game if any
        if (subscribedGameId) {
          unsubscribeFromGame(subscribedGameId, sendUpdate)
        }

        subscribedGameId = message.gameId
        subscribeToGame(message.gameId, sendUpdate)
        console.log(`Client subscribed to game ${message.gameId}`)
      }

      if (message.type === 'unsubscribe') {
        if (subscribedGameId) {
          unsubscribeFromGame(subscribedGameId, sendUpdate)
          subscribedGameId = null
        }
      }
    } catch (e) {
      console.error('Failed to parse WebSocket message:', e)
    }
  })

  ws.on('close', () => {
    if (subscribedGameId) {
      unsubscribeFromGame(subscribedGameId, sendUpdate)
    }
    console.log('WebSocket client disconnected')
  })

  function sendUpdate(game: SerializedGame) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'gameUpdate', game }))
    }
  }
})

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`WebSocket available on ws://localhost:${PORT}`)
  console.log(`CORS enabled for: ${CORS_ORIGIN}`)
})
