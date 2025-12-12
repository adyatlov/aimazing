'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { client, getWebSocketUrl } from '../../api/client'
import { useUserId } from '../contexts/UserContext'
import type { GameResponse } from '../../api/client'

export interface MazePreview {
  maze: ('WALL' | 'PATH')[][]
  entrance: { x: number; y: number }
  exit: { x: number; y: number }
}

export function usePreviewMaze() {
  const [maze, setMaze] = useState<MazePreview | null>(null)
  const [loading, setLoading] = useState(false)

  const generate = useCallback(async (mazeSize: number) => {
    setLoading(true)
    try {
      const result = await client.game.previewMaze({ mazeSize })
      setMaze(result)
      return result
    } finally {
      setLoading(false)
    }
  }, [])

  return { maze, loading, generate }
}

export function useCreateGame() {
  const userId = useUserId()
  return useMutation({
    mutationFn: async (params: {
      maze: MazePreview
      maxTurns?: number
      name: string
      prompt: string
    }) => {
      return await client.game.create({ ...params, userId })
    },
  })
}

export function useJoinGame() {
  const userId = useUserId()
  return useMutation({
    mutationFn: async (params: { gameId: string; name: string; prompt: string }) => {
      return await client.game.join({ ...params, userId })
    },
  })
}

export function useGame(gameId: string | null) {
  const userId = useUserId()
  const [game, setGame] = useState<GameResponse | null>(null)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

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
        playerId: userId,
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
  }, [gameId, userId])

  // Check if current user is a player (their prompt is visible)
  const isPlayer = game?.myPrompt !== undefined

  return {
    game,
    connected,
    error,
    isPlayer,
  }
}

export type { GameResponse }
