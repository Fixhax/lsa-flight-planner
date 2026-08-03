import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'

export const AuthContext = createContext<Session | null>(null)

/** Null when signed out or when no Supabase project is configured. */
export function useAuth(): Session | null {
  return useContext(AuthContext)
}
