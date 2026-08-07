import { useEffect, useState } from 'react'

// Keeps the screen from sleeping while `active` is true — used while GPS
// tracking is on, since a dark screen mid-flight defeats the point of a
// live map. The Wake Lock API requires https (or localhost) and isn't
// supported in every browser (notably older Safari), so `supported`
// distinguishes "not held because the browser can't" from "not held
// because tracking is off" — reported to the UI rather than failing
// silently either way.
export function useWakeLock(active: boolean): { supported: boolean; held: boolean; error: string | null } {
  const [held, setHeld] = useState(false)
  // Surfaced to the UI rather than swallowed — a wake lock that's
  // "supported" per feature detection but silently fails to acquire
  // (denied, reclaimed under battery saver, page not actually visible per
  // the browser's own stricter check, etc.) used to look identical to one
  // that's simply not held yet, giving no signal that anything went wrong.
  const [error, setError] = useState<string | null>(null)
  const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator

  useEffect(() => {
    if (!active || !supported) {
      setHeld(false)
      setError(null)
      return
    }

    let sentinel: WakeLockSentinel | null = null
    let cancelled = false

    async function acquire() {
      try {
        sentinel = await navigator.wakeLock.request('screen')
        if (cancelled) {
          sentinel.release()
          return
        }
        setHeld(true)
        setError(null)
        sentinel.addEventListener('release', () => setHeld(false))
      } catch (e) {
        setHeld(false)
        setError(e instanceof Error ? `${e.name}: ${e.message}` : 'Could not acquire wake lock.')
      }
    }

    acquire()

    // The lock is released automatically when the tab loses visibility
    // (switching apps, screen off) — re-request once it's visible again,
    // as long as tracking is still on.
    function handleVisibility() {
      if (document.visibilityState === 'visible' && !sentinel) acquire()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', handleVisibility)
      sentinel?.release()
      sentinel = null
    }
  }, [active, supported])

  return { supported, held, error }
}
