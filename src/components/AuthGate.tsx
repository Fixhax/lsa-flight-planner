import { useEffect, useState, type ReactNode, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, authConfigured } from '../lib/supabaseClient'
import { AuthContext } from '../lib/authContext'

export default function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(authConfigured)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!supabase) return

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  // No Supabase project configured yet — run without a login gate. See
  // README for how to turn this on.
  if (!authConfigured) return <AuthContext.Provider value={null}>{children}</AuthContext.Provider>

  if (loading) {
    return (
      <div className="auth-screen">
        <p className="footnote">Checking sign-in status&hellip;</p>
      </div>
    )
  }

  if (!session) {
    async function handleSubmit(e: FormEvent) {
      e.preventDefault()
      if (!supabase) return
      setSubmitting(true)
      setError(null)
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) setError(signInError.message)
      setSubmitting(false)
    }

    return (
      <div className="auth-screen">
        <form className="auth-card" onSubmit={handleSubmit}>
          <div className="brand auth-brand">
            LSA <span>Planner</span>
          </div>
          <p className="footnote">
            This tool is invite-only. If you don't have an account yet, ask the admin for an
            invite.
          </p>
          <div className="field">
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="auth-submit" disabled={submitting}>
            {submitting ? 'Signing in\u2026' : 'Sign in'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={session}>
      <div className="auth-bar">
        <span>{session.user.email}</span>
        <button type="button" onClick={() => supabase?.auth.signOut()}>
          Sign out
        </button>
      </div>
      {children}
    </AuthContext.Provider>
  )
}
