import { useEffect, useRef, useState } from 'react'
import type { Waypoint } from '../lib/planning'
import type { LivePosition } from '../lib/liveTracking'
import { distanceNm } from '../lib/geo'
import { fetchMetarTaf, fetchNearestStation, parseMetarWind, type MetarWind } from '../lib/metar'

interface Props {
  livePosition: LivePosition | null
  waypoints: Waypoint[]
  rotationDeg: number // current map rotation, so the sock can counter-rotate and stay true-referenced
}

// Re-query if the reference point has moved this far from where wind was
// last fetched — cheap enough to just always refetch on a fresh mount, but
// this keeps it from re-querying on every single GPS tick while cruising
// near where it already knows the answer.
const REFETCH_DISTANCE_NM = 20
// METAR obs are roughly hourly — this is just a "don't go stale for hours
// if the panel is left open" backstop, not an attempt at real-time wind.
const AUTO_REFRESH_MS = 15 * 60 * 1000

interface WindState {
  wind: MetarWind
  stationIcao: string
  stationDistanceNm: number | null // null when it's a waypoint's own ICAO, not a fallback nearest station
  fetchedAt: number
}

export default function WindsockOverlay({ livePosition, waypoints, rotationDeg }: Props) {
  const [state, setState] = useState<WindState | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastQueriedRef = useRef<{ lat: number; lon: number } | null>(null)

  const validWaypoints = waypoints.filter(
    (w) => Number.isFinite(w.lat) && Number.isFinite(w.lon) && (w.lat !== 0 || w.lon !== 0)
  )
  // Live position while GPS is on (wind actually where you are), otherwise
  // the first waypoint (checking the departure field before takeoff) —
  // same "auto" precedent used by the airspace check and the bearing
  // target picker elsewhere in this app.
  const refPoint = livePosition ?? validWaypoints[0] ?? null
  const refIcao = !livePosition && validWaypoints[0]?.icao ? validWaypoints[0].icao : null

  async function fetchWind(lat: number, lon: number, icao: string | null) {
    setLoading(true)
    setError(null)
    try {
      if (icao) {
        const { metar } = await fetchMetarTaf(icao)
        if (!metar) {
          setError(`No current METAR published for ${icao}.`)
          return
        }
        const wind = parseMetarWind(metar)
        if (!wind) {
          setError(`Could not read a wind group from ${icao}'s METAR.`)
          return
        }
        setState({ wind, stationIcao: icao, stationDistanceNm: null, fetchedAt: Date.now() })
        return
      }
      const nearest = await fetchNearestStation(lat, lon)
      if (!nearest) {
        setError('No METAR-reporting station found nearby.')
        return
      }
      const { metar } = await fetchMetarTaf(nearest.icao)
      if (!metar) {
        setError(`No current METAR published for ${nearest.icao}, the nearest reporting station.`)
        return
      }
      const wind = parseMetarWind(metar)
      if (!wind) {
        setError(`Could not read a wind group from ${nearest.icao}'s METAR.`)
        return
      }
      setState({
        wind,
        stationIcao: nearest.icao,
        stationDistanceNm: nearest.distanceNm,
        fetchedAt: Date.now()
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not fetch wind.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!refPoint) return
    const last = lastQueriedRef.current
    if (last && distanceNm(last, refPoint) < REFETCH_DISTANCE_NM) return
    lastQueriedRef.current = { lat: refPoint.lat, lon: refPoint.lon }
    fetchWind(refPoint.lat, refPoint.lon, refIcao)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refPoint?.lat, refPoint?.lon, refIcao])

  useEffect(() => {
    const id = setInterval(() => {
      if (!lastQueriedRef.current) return
      fetchWind(lastQueriedRef.current.lat, lastQueriedRef.current.lon, refIcao)
    }, AUTO_REFRESH_MS)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refIcao])

  function handleRefresh() {
    if (!refPoint) return
    lastQueriedRef.current = { lat: refPoint.lat, lon: refPoint.lon }
    fetchWind(refPoint.lat, refPoint.lon, refIcao)
  }

  if (!refPoint) return null

  // A real windsock streams AWAY from where the wind is coming from —
  // METAR direction is the FROM direction, so the sock itself points
  // 180deg from that. Counter-rotate by the map's own track-up rotation so
  // this keeps pointing at the true compass direction on screen rather
  // than drifting with whatever way "up" currently means on the map.
  const sockRotation =
    state && state.wind.dirDeg !== null ? (state.wind.dirDeg + 180 - rotationDeg + 360) % 360 : null

  return (
    <div className="map-windsock">
      <svg viewBox="0 0 60 60" className="map-windsock-icon" role="img" aria-label="Windsock">
        <line x1="30" y1="6" x2="30" y2="54" stroke="#888" strokeWidth="2" />
        {sockRotation !== null ? (
          <g transform={`rotate(${sockRotation} 30 12)`}>
            <polygon points="30,6 30,18 54,12" fill="#ff6b35" stroke="#0d1117" strokeWidth="1" opacity="0.92" />
            <polygon points="30,9 30,15 44,12" fill="#fff" opacity="0.5" />
          </g>
        ) : (
          <circle cx="30" cy="12" r="5" fill="#555" stroke="#0d1117" strokeWidth="1" />
        )}
      </svg>
      <div className="map-windsock-text">
        {state ? (
          <>
            <span className="map-windsock-value">
              {state.wind.variable ? 'VRB' : `${String(state.wind.dirDeg).padStart(3, '0')}°`}
              {' / '}
              {Math.round(state.wind.speedKt)}kt
              {state.wind.gustKt !== null && `G${Math.round(state.wind.gustKt)}`}
            </span>
            <span className="map-windsock-station">
              {state.stationIcao}
              {state.stationDistanceNm !== null && ` · ${state.stationDistanceNm.toFixed(0)}nm`}
              {/* A later refresh failing doesn't erase the last good
                  reading — just flags it, since stale-but-real wind is
                  more useful than no wind at all. */}
              {error && ' · refresh failed'}
            </span>
          </>
        ) : error ? (
          <span className="map-windsock-error">{error}</span>
        ) : (
          <span className="map-windsock-station">{loading ? 'Fetching wind…' : '—'}</span>
        )}
      </div>
      <button
        type="button"
        className="map-windsock-refresh"
        onClick={handleRefresh}
        disabled={loading}
        title="Refresh wind from METAR"
        aria-label="Refresh wind from METAR"
      >
        {loading ? '…' : '↻'}
      </button>
    </div>
  )
}
