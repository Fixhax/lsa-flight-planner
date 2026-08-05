import { useEffect, useState } from 'react'

// Keeps the screen from sleeping while `active` is true — used while GPS
// tracking is on, since a dark screen mid-flight defeats the point of a
// live map. The Wake Lock API requires https (or localhost) and isn't
// supported in every browser (notably older Safari), so `supported`
// distinguishes "not held because the browser can't" from "not held
// because tracking is off" — reported to the UI rather than failing
// silently either way.
export function useWakeLock(active: boolean): { supported: boolean; held: boolean } {
  const [held, setHeld] = useState(false)
  const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator

  useEffect(() => {
    if (!active || !supported) {
      setHeld(false)
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
        sentinel.addEventListener('release', () => setHeld(false))
      } catch {
        // Denied, or the browser reclaimed it (e.g. low battery) — just
        // reflect "not held" rather than surfacing an error for something
        // that isn't actionable from here.
        setHeld(false)
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

  return { supported, held }
}
