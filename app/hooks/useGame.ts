'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { client } from '../../api/client'
import type { SerializedGame } from '../../api/router'

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
  return useQuery({
    queryKey: ['game', gameId],
    queryFn: async () => {
      if (!gameId) throw new Error('No game ID')
      return client.game.get({ gameId })
    },
    enabled: !!gameId,
    refetchInterval: (query) => {
      const data = query.state.data as SerializedGame | undefined
      // Poll faster during gameplay, stop when finished
      if (data?.status === 'PLAYING') {
        return 300 // Poll every 300ms during gameplay
      }
      if (data?.status === 'FINISHED') {
        return false // Stop polling when finished
      }
      return 1000 // Poll every second while waiting
    },
    staleTime: 100,
  })
}

export function useGamesList() {
  return useQuery({
    queryKey: ['games'],
    queryFn: () => client.game.list({}),
    refetchInterval: 5000,
  })
}
