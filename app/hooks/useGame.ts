'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { client, getWebSocketUrl } from '../../api/client'
import type { SerializedGame } from '../../api/client'

// Cookie helpers
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : null
}

function setCookie(name: string, value: string, days: number = 30) {
  if (typeof document === 'undefined') return
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`
}

export function getPlayerSecret(gameId: string): string | null {
  return getCookie(`player_${gameId}`)
}

export function setPlayerSecret(gameId: string, secret: string) {
  setCookie(`player_${gameId}`, secret)
}

export function useCreateGame() {
  return useMutation({
    mutationFn: async (params: { mazeSize?: number; maxTurns?: number }) => {
      return client.game.create(params)
    },
  })
}

export function useJoinGame() {
  return useMutation({
    mutationFn: async (params: { gameId: string; name: string; prompt: string }) => {
      const result = await client.game.join(params)
      // Store player secret in cookie
      setPlayerSecret(params.gameId, result.playerSecret)
      return result
    },
  })
}

export function useGame(gameId: string | null) {
  const [game, setGame] = useState<SerializedGame | null>(null)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!gameId) return

    const playerSecret = getPlayerSecret(gameId)
    const wsUrl = getWebSocketUrl()
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      ws.send(JSON.stringify({
        type: 'subscribeGame',
        gameId,
        playerSecret,
      }))
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        if (message.type === 'gameUpdate' && message.game) {
          setGame(message.game)
          setError(null)
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
      setError(new Error('WebSocket connection failed'))
    }

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'unsubscribeGame' }))
      }
      ws.close()
      wsRef.current = null
    }
  }, [gameId])

  // Check if current user is a player in this game
  const playerSecret = gameId ? getPlayerSecret(gameId) : null
  const isPlayer = game?.players.some(p => p.prompt !== undefined) ?? false

  return {
    game,
    connected,
    error,
    isPlayer,
    playerSecret,
  }
}

export type { SerializedGame }
