import { useMemo, useRef, useState } from 'react'
import type { Waypoint } from '../lib/planning'
import type { LivePosition } from '../lib/liveTracking'
import { formatMhz, nearbyRegionalFrequencies } from '../lib/frequencies'
import { distanceNm } from '../lib/geo'
import { airspaceClassLabel, fetchAirspaceCeiling, type AirspaceCeilingResult } from '../lib/airspace'
import { useCloseOnOutsideClick } from '../hooks/useCloseOnOutsideClick'

const NEARBY_RADIUS_NM = 50

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

  const valid = waypoints.filter(
    (w) => Number.isFinite(w.lat) && Number.isFinite(w.lon) && (w.lat !== 0 || w.lon !== 0)
  )

  const nearbyFreq = useMemo(() => {
    const points = valid.map((w) => ({ lat: w.lat, lon: w.lon }))
    if (livePosition) points.push({ lat: livePosition.lat, lon: livePosition.lon })
    return nearbyRegionalFrequencies(points, NEARBY_RADIUS_NM, distanceNm, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valid, livePosition?.lat, livePosition?.lon])

  // Checks around the live GPS position when tracking, otherwise the first
  // waypoint (e.g. checking your departure field before takeoff with GPS off).
  const checkPoint = livePosition ?? valid[0] ?? null

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
            <button
              type="button"
              className="map-info-check-btn"
              onClick={handleCheckAirspace}
              disabled={airspaceLoading || !checkPoint}
            >
              {airspaceLoading
                ? 'Checking…'
                : `Check airspace ${livePosition ? 'at my position' : 'at first waypoint'}`}
            </button>
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
          </div>
        )}
      </div>
    </div>
  )
}
