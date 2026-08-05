import { useState } from 'react'
import type { Waypoint } from '../lib/planning'
import { fetchMetarTaf, fetchNearestStation } from '../lib/metar'
import { decodeMetar, decodeTaf, type DecodedSection } from '../lib/metarDecode'

interface ResolvedTarget {
  waypointLabel: string
  icao: string
  distanceNm: number | null // null when it's the waypoint's own ICAO; set when it's a fallback nearest station
  metar: string | null
  taf: string | null
}

function DecodedSections({ sections }: { sections: DecodedSection[] }) {
  return (
    <div className="metar-taf-decoded">
      {sections.map((s, i) => (
        <div className="metar-taf-decoded-section" key={i}>
          {s.header && <p className="metar-taf-decoded-header">{s.header}</p>}
          {s.lines.length > 0 && (
            <ul className="metar-taf-decoded-list">
              {s.lines.map((line, j) => (
                <li key={j}>{line}</li>
              ))}
            </ul>
          )}
          {s.unparsed.length > 0 && (
            <p className="metar-taf-decoded-unparsed">
              Not decoded (read as-is above): {s.unparsed.join(' ')}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

async function resolveTarget(wp: Waypoint, label: string): Promise<ResolvedTarget | null> {
  if (wp.icao) {
    const { metar, taf } = await fetchMetarTaf(wp.icao)
    return { waypointLabel: label, icao: wp.icao, distanceNm: null, metar, taf }
  }
  const nearest = await fetchNearestStation(wp.lat, wp.lon)
  if (!nearest) return null
  const { metar, taf } = await fetchMetarTaf(nearest.icao)
  return { waypointLabel: label, icao: nearest.icao, distanceNm: nearest.distanceNm, metar, taf }
}

export default function MetarTaf({ waypoints }: { waypoints: Waypoint[] }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<ResolvedTarget[] | null>(null)
  const [translated, setTranslated] = useState<Set<string>>(new Set())

  function toggleTranslated(icao: string) {
    setTranslated((prev) => {
      const next = new Set(prev)
      if (next.has(icao)) next.delete(icao)
      else next.add(icao)
      return next
    })
  }

  const valid = waypoints.filter(
    (w) => Number.isFinite(w.lat) && Number.isFinite(w.lon) && (w.lat !== 0 || w.lon !== 0)
  )
  const departure = valid[0]
  const destination = valid[valid.length - 1]

  async function handleFetch() {
    if (valid.length === 0) {
      setError('Add at least one waypoint first.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const targets =
        valid.length === 1 || departure === destination
          ? [{ label: departure.name || 'Waypoint', wp: departure }]
          : [
              { label: departure.name || 'Departure', wp: departure },
              { label: destination.name || 'Destination', wp: destination }
            ]
      const resolved = (await Promise.all(targets.map((t) => resolveTarget(t.wp, t.label)))).filter(
        (r): r is ResolvedTarget => r !== null
      )

      if (resolved.length === 0) {
        setError('No METAR/TAF-reporting station found near your route.')
        setResults(null)
        return
      }

      // Merge when both waypoints resolved to the same station (e.g. a
      // short leg where both fall back to the same nearest airport),
      // rather than showing an identical card twice.
      const merged = new Map<string, ResolvedTarget>()
      for (const r of resolved) {
        const existing = merged.get(r.icao)
        if (existing) existing.waypointLabel = `${existing.waypointLabel} & ${r.waypointLabel}`
        else merged.set(r.icao, { ...r })
      }
      setResults(Array.from(merged.values()))
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
              <p className="metar-taf-icao">
                {r.icao}
                {r.distanceNm === null ? (
                  ` — ${r.waypointLabel}`
                ) : (
                  <span className="metar-taf-nearest-note">
                    {' '}
                    — nearest reporting station to {r.waypointLabel}, {r.distanceNm.toFixed(0)} nm away
                    (not the field itself)
                  </span>
                )}
              </p>
              <p className="metar-taf-label">METAR</p>
              <pre className="metar-taf-text">{r.metar ?? 'No current METAR published.'}</pre>
              {translated.has(r.icao) && r.metar && <DecodedSections sections={decodeMetar(r.metar)} />}
              <p className="metar-taf-label">TAF</p>
              <pre className="metar-taf-text">{r.taf ?? 'No current TAF published.'}</pre>
              {translated.has(r.icao) && r.taf && <DecodedSections sections={decodeTaf(r.taf)} />}
              {(r.metar || r.taf) && (
                <button
                  type="button"
                  className="metar-taf-translate-btn"
                  onClick={() => toggleTranslated(r.icao)}
                >
                  {translated.has(r.icao) ? 'Hide plain-language translation' : 'Translate to plain language'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
