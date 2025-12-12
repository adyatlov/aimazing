'use client'

import { useEffect, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { client, getWebSocketUrl } from '../../api/client'
import type { GameResponse } from '../../api/client'

// Store playerId for each game in localStorage
export function getPlayerId(gameId: string): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(`player_${gameId}`)
}

export function setPlayerId(gameId: string, playerId: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(`player_${gameId}`, playerId)
}

export function useCreateGame() {
  return useMutation({
    mutationFn: async (params: {
      mazeSize?: number
      maxTurns?: number
      name: string
      prompt: string
    }) => {
      const result = await client.game.create(params)
      setPlayerId(result.gameId, result.playerId)
      return result
    },
  })
}

export function useJoinGame() {
  return useMutation({
    mutationFn: async (params: { gameId: string; name: string; prompt: string }) => {
      const result = await client.game.join(params)
      setPlayerId(params.gameId, result.playerId)
      return result
    },
  })
}

export function useGame(gameId: string | null) {
  const [game, setGame] = useState<GameResponse | null>(null)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  // Get playerId for this game (if we're a player)
  const playerId = gameId ? getPlayerId(gameId) : null

  useEffect(() => {
    if (!gameId) return

    const wsUrl = getWebSocketUrl()
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      ws.send(JSON.stringify({
        type: 'subscribeGame',
        gameId,
        playerId,
      }))
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        if (message.type === 'gameUpdate' && message.game) {
          setGame(message.game)
          setError(null)
        } else if (message.type === 'gameNotFound') {
          setError(new Error('Game not found'))
          setGame(null)
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
  }, [gameId, playerId])

  // Check if current user is a player (their prompt is visible)
  const isPlayer = game?.myPrompt !== undefined

  return {
    game,
    connected,
    error,
    isPlayer,
    playerId,
  }
}

export type { GameResponse }
