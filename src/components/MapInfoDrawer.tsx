import { useMemo, useRef, useState } from 'react'
import type { Waypoint } from '../lib/planning'
import type { LivePosition } from '../lib/liveTracking'
import { formatMhz, nearbyRegionalFrequencies } from '../lib/frequencies'
import { distanceNm } from '../lib/geo'
import { airspaceClassLabel, fetchAirspaceCeiling, type AirspaceCeilingResult } from '../lib/airspace'
import { useCloseOnOutsideClick } from '../hooks/useCloseOnOutsideClick'

const NEARBY_RADIUS_NM = 50

interface RouteCheckRow {
  id: string
  label: string
  loading: boolean
  error: string | null
  result: AirspaceCeilingResult | null
}

interface Props {
  waypoints: Waypoint[]
  livePosition?: LivePosition | null
  onClose: () => void
}

export default function MapInfoDrawer({ waypoints, livePosition, onClose }: Props) {
  const drawerRef = useRef<HTMLDivElement | null>(null)
  useCloseOnOutsideClick(drawerRef, true, onClose)

  const [freqOpen, setFreqOpen] = useState(true)
  const [airspaceOpen, setAirspaceOpen] = useState(true)
  const [airspaceLoading, setAirspaceLoading] = useState(false)
  const [airspaceError, setAirspaceError] = useState<string | null>(null)
  const [airspaceResult, setAirspaceResult] = useState<AirspaceCeilingResult | null>(null)
  // Which point the single-point check below runs against — 'auto' keeps
  // the original zero-friction default (live position while GPS is on,
  // otherwise the first waypoint), but this is now overridable to any
  // waypoint along the route rather than being locked to just those two.
  const [checkTargetId, setCheckTargetId] = useState('auto')

  const [routeCheck, setRouteCheck] = useState<RouteCheckRow[] | null>(null)
  const [routeChecking, setRouteChecking] = useState(false)

  const valid = waypoints.filter(
    (w) => Number.isFinite(w.lat) && Number.isFinite(w.lon) && (w.lat !== 0 || w.lon !== 0)
  )

  const nearbyFreq = useMemo(() => {
    const points = valid.map((w) => ({ lat: w.lat, lon: w.lon }))
    if (livePosition) points.push({ lat: livePosition.lat, lon: livePosition.lon })
    return nearbyRegionalFrequencies(points, NEARBY_RADIUS_NM, distanceNm, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valid, livePosition?.lat, livePosition?.lon])

  // Every point the single-point picker can target: live position first
  // (when GPS is on), then each route waypoint in order.
  const checkTargets = [
    ...(livePosition ? [{ id: 'live', label: 'My position', lat: livePosition.lat, lon: livePosition.lon }] : []),
    ...valid.map((w, i) => ({ id: `wp-${w.id}`, label: w.name || `WP${i + 1}`, lat: w.lat, lon: w.lon }))
  ]
  // 'auto' keeps the original default — live position while tracking,
  // otherwise the first waypoint (e.g. checking your departure field before
  // takeoff with GPS off) — without needing the picker touched at all.
  const checkPoint =
    checkTargetId === 'auto'
      ? (checkTargets[0] ?? null)
      : (checkTargets.find((t) => t.id === checkTargetId) ?? checkTargets[0] ?? null)

  async function handleCheckAirspace() {
    if (!checkPoint) {
      setAirspaceError('Add a waypoint or start GPS tracking first.')
      return
    }
    const apiKey = import.meta.env.VITE_OPENAIP_API_KEY as string | undefined
    if (!apiKey) {
      setAirspaceError('No OpenAIP API key configured.')
      return
    }
    setAirspaceLoading(true)
    setAirspaceError(null)
    try {
      setAirspaceResult(await fetchAirspaceCeiling(checkPoint.lat, checkPoint.lon, apiKey))
    } catch (e) {
      setAirspaceError(e instanceof Error ? e.message : 'Could not check airspace.')
    } finally {
      setAirspaceLoading(false)
    }
  }

  // Checks every waypoint along the route in turn, compiling one ceiling
  // result per leg instead of just the single point above. Sequential
  // (not Promise.all) rather than firing every request at once — gentler
  // on OpenAIP for a long route, and each row updates as its own result
  // comes in rather than the whole list waiting on the slowest lookup.
  // One waypoint failing doesn't stop the rest from being checked.
  async function handleCheckRoute() {
    if (valid.length === 0) {
      setAirspaceError('Add at least one waypoint first.')
      return
    }
    const apiKey = import.meta.env.VITE_OPENAIP_API_KEY as string | undefined
    if (!apiKey) {
      setAirspaceError('No OpenAIP API key configured.')
      return
    }
    setAirspaceError(null)
    setRouteChecking(true)
    const rows: RouteCheckRow[] = valid.map((w, i) => ({
      id: w.id,
      label: w.name || `WP${i + 1}`,
      loading: true,
      error: null,
      result: null
    }))
    setRouteCheck(rows)

    for (let i = 0; i < valid.length; i++) {
      const wp = valid[i]
      try {
        const result = await fetchAirspaceCeiling(wp.lat, wp.lon, apiKey)
        setRouteCheck((prev) => prev?.map((r, idx) => (idx === i ? { ...r, loading: false, result } : r)) ?? prev)
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Could not check airspace.'
        setRouteCheck((prev) => prev?.map((r, idx) => (idx === i ? { ...r, loading: false, error: message } : r)) ?? prev)
      }
    }
    setRouteChecking(false)
  }

  function summarizeCeiling(result: AirspaceCeilingResult): string {
    if (!result.limiting) return 'Clear — nothing controlled/restricted overhead'
    const cls = airspaceClassLabel(result.limiting.icaoClass)
    if (result.atSurface) return `At surface: ${result.limiting.name} (Class ${cls})`
    if (result.maxClimbFt !== null) {
      return `Climb to ~${Math.round(result.maxClimbFt).toLocaleString()} ft before ${result.limiting.name} (Class ${cls})`
    }
    return `${result.limiting.name} (Class ${cls}) overhead, floor unknown`
  }

  return (
    <div className="map-info-drawer" ref={drawerRef}>
      <div className="map-info-drawer-header">
        <p className="panel-sublabel">Nearby info</p>
        <button type="button" className="map-info-drawer-close" onClick={onClose} aria-label="Close">
          &times;
        </button>
      </div>

      <div className="map-info-section">
        <button type="button" className="map-info-section-toggle" onClick={() => setFreqOpen((o) => !o)}>
          <span>Radio frequencies (within {NEARBY_RADIUS_NM} nm)</span>
          <span className="map-info-caret">{freqOpen ? '▾' : '▸'}</span>
        </button>
        {freqOpen && (
          <div className="map-info-section-body">
            {nearbyFreq.length === 0 ? (
              <p className="empty-hint">No route or live position yet, or nothing confirmed nearby.</p>
            ) : (
              nearbyFreq.map((f) => (
                <div className="freq-row freq-row-reference" key={`${f.label}-${f.mhz}`}>
                  <span className="freq-type">
                    {f.label}
                    {f.approximate && <span className="freq-unverified-tag">approx. area</span>}
                  </span>
                  <span className="freq-mhz">
                    {formatMhz(f.mhz)}{' '}
                    <span className="freq-scope">
                      {Number.isNaN(f.distanceNm) ? '(always listed)' : `(${f.distanceNm.toFixed(0)} nm)`}
                    </span>
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="map-info-section">
        <button type="button" className="map-info-section-toggle" onClick={() => setAirspaceOpen((o) => !o)}>
          <span>Airspace ceiling (OpenAIP)</span>
          <span className="map-info-caret">{airspaceOpen ? '▾' : '▸'}</span>
        </button>
        {airspaceOpen && (
          <div className="map-info-section-body">
            {checkTargets.length > 1 && (
              <div className="map-info-target-picker">
                <label htmlFor="airspace-check-target">Check at</label>
                <select
                  id="airspace-check-target"
                  value={checkTargetId}
                  onChange={(e) => setCheckTargetId(e.target.value)}
                >
                  <option value="auto">
                    Auto ({livePosition ? 'my position' : 'first waypoint'})
                  </option>
                  {checkTargets.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              type="button"
              className="map-info-check-btn"
              onClick={handleCheckAirspace}
              disabled={airspaceLoading || !checkPoint}
            >
              {airspaceLoading ? 'Checking…' : `Check airspace at ${checkPoint?.label ?? '—'}`}
            </button>
            {valid.length > 1 && (
              <button
                type="button"
                className="map-info-check-btn"
                onClick={handleCheckRoute}
                disabled={routeChecking}
              >
                {routeChecking ? 'Checking route…' : 'Check airspace at every waypoint'}
              </button>
            )}
            {airspaceError && <p className="auth-error">{airspaceError}</p>}
            {airspaceResult && !airspaceError && (
              <>
                {airspaceResult.limiting ? (
                  <p className="map-info-ceiling-result">
                    {airspaceResult.atSurface ? (
                      <>
                        You're laterally within <strong>{airspaceResult.limiting.name}</strong> (Class{' '}
                        {airspaceClassLabel(airspaceResult.limiting.icaoClass)}) &mdash; it starts at the
                        surface, so any altitude here needs clearance.
                      </>
                    ) : airspaceResult.maxClimbFt !== null ? (
                      <>
                        Can climb to about{' '}
                        <strong>{Math.round(airspaceResult.maxClimbFt).toLocaleString()} ft</strong> before
                        entering <strong>{airspaceResult.limiting.name}</strong> (Class{' '}
                        {airspaceClassLabel(airspaceResult.limiting.icaoClass)}, floor{' '}
                        {airspaceResult.limiting.lowerLabel}).
                      </>
                    ) : (
                      <>
                        <strong>{airspaceResult.limiting.name}</strong> (Class{' '}
                        {airspaceClassLabel(airspaceResult.limiting.icaoClass)}) is overhead but its floor
                        couldn't be read from OpenAIP's data &mdash; treat with caution.
                      </>
                    )}
                  </p>
                ) : (
                  <p className="map-info-ceiling-result">
                    No controlled, restricted, danger, or prohibited airspace found overhead in OpenAIP's
                    data.
                  </p>
                )}
                {airspaceResult.nearby.length > 1 && (
                  <div className="map-info-ceiling-list">
                    {airspaceResult.nearby.map((a) => (
                      <div className="freq-row freq-row-reference" key={a.id}>
                        <span className="freq-type">
                          {a.name} <span className="freq-scope">Class {airspaceClassLabel(a.icaoClass)}</span>
                        </span>
                        <span className="freq-mhz">
                          {a.lowerLabel} &ndash; {a.upperLabel}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <p className="footnote">
                  From OpenAIP's community-maintained dataset around this single point only &mdash; not
                  exhaustive, and floors given as AGL are approximate without local terrain data. Always
                  cross-check the current AIP before relying on this.
                </p>
              </>
            )}
            {routeCheck && (
              <>
                <div className="map-info-ceiling-list">
                  {routeCheck.map((row) => (
                    <div className="map-info-route-check-row" key={row.id}>
                      <span className="map-info-route-check-label">{row.label}</span>
                      <span className="map-info-route-check-summary">
                        {row.loading
                          ? 'Checking…'
                          : row.error
                            ? row.error
                            : row.result
                              ? summarizeCeiling(row.result)
                              : '—'}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="footnote">
                  One lookup per waypoint, around that single point only &mdash; same OpenAIP data and caveats
                  as the single check above. A busy route means several requests in a row; give it a moment.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
