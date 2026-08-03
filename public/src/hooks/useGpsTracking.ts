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
        setPosition({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          speedKt: pos.coords.speed != null ? pos.coords.speed * 1.94384 : undefined,
          headingDeg: pos.coords.heading ?? undefined,
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
  }

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
    }
  }, [])

  return { tracking, position, error, start, stop }
}
