import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const authConfigured = Boolean(url && anonKey)

// If env vars aren't set, `supabase` is null and the app falls back to
// running without a login gate (see App.tsx) — this keeps local dev and
// the plain demo working without forcing everyone to set up Supabase
// first. Fill in .env (see .env.example) and redeploy to turn login on.
export const supabase = authConfigured ? createClient(url as string, anonKey as string) : null
