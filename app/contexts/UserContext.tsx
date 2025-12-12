'use client'

import { createContext, useContext } from 'react'

const UserContext = createContext<string | null>(null)

export function UserProvider({ userId, children }: { userId: string; children: React.ReactNode }) {
  return <UserContext.Provider value={userId}>{children}</UserContext.Provider>
}

export function useUserId(): string {
  const userId = useContext(UserContext)
  if (!userId) throw new Error('useUserId must be used within UserProvider')
  return userId
}
