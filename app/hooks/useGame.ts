'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { client, getWebSocketUrl } from '../../api/client'
import type { SerializedGame } from '../../api/client'

export function useCreateGame() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { mazeSize?: number; maxTurns?: number }) => {
      return client.game.create(params)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games'] })
    },
  })
}

export function useJoinGame() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { gameId: string; name: string; prompt: string }) => {
      return client.game.join(params)
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['game', data.id], data)
      queryClient.invalidateQueries({ queryKey: ['games'] })
    },
  })
}

export function useStartGame() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (gameId: string) => {
      return client.game.start({ gameId })
    },
    onSuccess: (_, gameId) => {
      queryClient.invalidateQueries({ queryKey: ['game', gameId] })
    },
  })
}

export function useGame(gameId: string | null) {
  const queryClient = useQueryClient()
  const wsRef = useRef<WebSocket | null>(null)
  const [wsConnected, setWsConnected] = useState(false)

  // Initial fetch
  const query = useQuery({
    queryKey: ['game', gameId],
    queryFn: async () => {
      if (!gameId) throw new Error('No game ID')
      return client.game.get({ gameId })
    },
    enabled: !!gameId,
    staleTime: Infinity, // WebSocket will handle updates
  })

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!gameId) return

    const wsUrl = getWebSocketUrl()
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setWsConnected(true)
      // Subscribe to game updates
      ws.send(JSON.stringify({ type: 'subscribe', gameId }))
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        if (message.type === 'gameUpdate' && message.game) {
          // Update the query cache with new game state
          queryClient.setQueryData(['game', gameId], message.game)
        }
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e)
      }
    }

    ws.onclose = () => {
      setWsConnected(false)
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      setWsConnected(false)
    }

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'unsubscribe' }))
      }
      ws.close()
      wsRef.current = null
    }
  }, [gameId, queryClient])

  return {
    ...query,
    wsConnected,
  }
}

export function useGamesList() {
  return useQuery({
    queryKey: ['games'],
    queryFn: () => client.game.list({}),
    refetchInterval: 5000,
  })
}

export type { SerializedGame }
