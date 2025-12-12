'use client'

import { useEffect, useRef, useState } from 'react'
import { getWebSocketUrl } from '../../api/client'
import { useUserId } from '../contexts/UserContext'
import type { GameListItem } from '../../api/client'

export function useGameList(includeFinished: boolean = false) {
  const userId = useUserId()
  const [games, setGames] = useState<GameListItem[]>([])
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const wsUrl = getWebSocketUrl()
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      ws.send(JSON.stringify({ type: 'subscribeList', userId }))
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        if (message.type === 'gameList' && message.games) {
          let gameList = message.games as GameListItem[]
          if (!includeFinished) {
            gameList = gameList.filter(g => g.status === 'WAITING' || g.status === 'PLAYING')
          }
          setGames(gameList)
        }
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e)
      }
    }

    ws.onclose = () => {
      setConnected(false)
    }

    ws.onerror = () => {
      setConnected(false)
    }

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'unsubscribeList' }))
      }
      ws.close()
      wsRef.current = null
    }
  }, [userId, includeFinished])

  return { games, connected }
}

export type { GameListItem }
