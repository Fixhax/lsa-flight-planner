import { useState } from 'react'
import type { Waypoint } from '../lib/planning'
import { fetchMetarTaf, type MetarTafResult } from '../lib/metar'

export default function MetarTaf({ waypoints }: { waypoints: Waypoint[] }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<MetarTafResult[] | null>(null)

  const valid = waypoints.filter(
    (w) => Number.isFinite(w.lat) && Number.isFinite(w.lon) && (w.lat !== 0 || w.lon !== 0)
  )
  const departure = valid[0]
  const destination = valid[valid.length - 1]
  // Dedupe departure/destination when they're the same point, and only
  // keep the ones that actually carry an ICAO identifier.
  const icaoTargets = Array.from(
    new Set([departure?.icao, destination?.icao].filter((x): x is string => !!x))
  )

  async function handleFetch() {
    if (icaoTargets.length === 0) {
      setError(
        valid.length === 0
          ? 'Add at least one waypoint first.'
          : "Neither your departure nor destination has a known ICAO identifier — most curated grass/gravel strips are uncontrolled and have no METAR/TAF."
      )
      return
    }
    setLoading(true)
    setError(null)
    try {
      const fetched = await Promise.all(icaoTargets.map((icao) => fetchMetarTaf(icao)))
      setResults(fetched)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not fetch METAR/TAF.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="metar-taf">
      <button type="button" className="fetch-weather-btn" onClick={handleFetch} disabled={loading}>
        {loading ? 'Fetching…' : 'Fetch METAR/TAF for route'}
      </button>
      {error && <p className="auth-error">{error}</p>}

      {results && (
        <div className="metar-taf-cards">
          {results.map((r) => (
            <div className="metar-taf-card" key={r.icao}>
              <p className="metar-taf-icao">{r.icao}</p>
              <p className="metar-taf-label">METAR</p>
              <pre className="metar-taf-text">{r.metar ?? 'No current METAR published.'}</pre>
              <p className="metar-taf-label">TAF</p>
              <pre className="metar-taf-text">{r.taf ?? 'No current TAF published.'}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
