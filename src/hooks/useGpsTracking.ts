import { useEffect, useRef, useState } from 'react'
import type { LivePosition } from '../lib/liveTracking'

export function useGpsTracking(
  onPositionChange: (pos: LivePosition | null) => void,
  onStatusChange?: (status: string | null) => void
) {
  const [tracking, setTracking] = useState(false)
  const [position, setPosition] = useState<LivePosition | null>(null)
  const [error, setError] = useState<string | null>(null)
  const watchIdRef = useRef<number | null>(null)
  // Per the Geolocation spec, coords.heading is NaN (not null) whenever the
  // device's reported speed is ~0 — i.e. every time you're stationary, not
  // just when heading genuinely isn't supported. That NaN slips straight
  // past a `?? undefined` fallback (NaN isn't null/undefined), so it used
  // to reach the map as a real "heading" value and render as an invalid
  // rotate(NaNdeg) transform, which browsers silently drop — leaving the
  // plane icon stuck at its unrotated, north-up default. Holding onto the
  // last known-good heading here instead means the icon keeps pointing the
  // way you were actually going through a momentary stop, rather than
  // snapping to north every time the GPS can't compute a fresh course.
  const lastHeadingRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    onPositionChange(position)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position])

  useEffect(() => {
    if (!onStatusChange) return
    onStatusChange(tracking ? (position ? 'GPS tracking' : 'GPS starting\u2026') : null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracking, !!position])

  function start() {
    if (!('geolocation' in navigator)) {
      setError('This browser doesn\u2019t support GPS location.')
      return
    }
    // Geolocation generally requires a secure context (https, or localhost)
    // — a plain http/file page will typically fail here with a permission
    // or unsupported error, not a bug in this app.
    setError(null)
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const rawHeading = pos.coords.heading
        const headingDeg = Number.isFinite(rawHeading) ? (rawHeading as number) : lastHeadingRef.current
        if (headingDeg !== undefined) lastHeadingRef.current = headingDeg
        setPosition({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          speedKt: pos.coords.speed != null ? pos.coords.speed * 1.94384 : undefined,
          headingDeg,
          // Not every device/GPS chip reports altitude — falls back to the
          // planned cruise altitude wherever this is used when absent.
          altitudeFt: pos.coords.altitude != null ? pos.coords.altitude * 3.28084 : undefined,
          accuracyM: pos.coords.accuracy,
          timestamp: pos.timestamp
        })
      },
      (err) => {
        setError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied \u2014 allow it in your browser settings to use this.'
            : `Could not get location: ${err.message}`
        )
        setTracking(false)
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    )
    watchIdRef.current = id
    setTracking(true)
  }

  function stop() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setTracking(false)
    setPosition(null)
    lastHeadingRef.current = undefined
  }

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
    }
  }, [])

  return { tracking, position, error, start, stop }
}
