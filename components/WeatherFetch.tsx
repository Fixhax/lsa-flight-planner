import { useState } from 'react'
import type { Waypoint } from '../lib/planning'
import { fetchRouteWind, type FetchedWind } from '../lib/weather'
import type { Wind } from '../lib/wind'

interface Props {
  waypoints: Waypoint[]
  altitudeFt: number
  onFetched: (wind: Wind) => void
}

export default function WeatherFetch({ waypoints, altitudeFt, onFetched }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<FetchedWind | null>(null)

  const valid = waypoints.filter(
    (w) => Number.isFinite(w.lat) && Number.isFinite(w.lon) && (w.lat !== 0 || w.lon !== 0)
  )

  async function handleFetch() {
    if (valid.length === 0) {
      setError('Add at least one waypoint first.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      // Centroid of the route — this app models one wind for the whole
      // trip, so a single representative point is consistent with that.
      const lat = valid.reduce((s, w) => s + w.lat, 0) / valid.length
      const lon = valid.reduce((s, w) => s + w.lon, 0) / valid.length
      const wind = await fetchRouteWind(lat, lon, altitudeFt)
      setResult(wind)
      onFetched({ directionTrueDeg: wind.directionTrueDeg, speedKt: wind.speedKt })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not fetch weather.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="weather-fetch">
      <button type="button" className="fetch-weather-btn" onClick={handleFetch} disabled={loading}>
        {loading ? 'Fetching forecast\u2026' : 'Fetch forecast wind for route'}
      </button>
      {error && <p className="auth-error">{error}</p>}
      {result && !error && (
        <p className="weather-status">
          Filled in {result.directionTrueDeg.toFixed(0)}&deg;/{result.speedKt.toFixed(0)}kt from
          the forecast nearest {result.levelAltFt.toLocaleString()} ft ({result.levelHpa} hPa),
          valid {result.validTime.slice(11, 16)} local at that point.
        </p>
      )}
      <p className="footnote">
        Pulls a general forecast (Open-Meteo) for the route's midpoint at the pressure level
        closest to your cruise altitude &mdash; a convenience for roughing in a number, not an
        aviation weather briefing. It has no METAR/TAF/SIGMET/NOTAM data. Always get a proper
        pre-flight briefing before you fly. Requires an internet connection.
      </p>
    </div>
  )
}
