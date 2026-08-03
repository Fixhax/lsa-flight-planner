import { useMemo, useState } from 'react'
import type { Waypoint } from '../lib/planning'
import { REFERENCE_FREQUENCIES, formatMhz, nearbyRegionalFrequencies } from '../lib/frequencies'
import { distanceNm } from '../lib/geo'
import type { LivePosition } from '../lib/liveTracking'

const NEARBY_RADIUS_NM = 50

export default function RadioFrequencies({
  waypoints,
  livePosition
}: {
  waypoints: Waypoint[]
  livePosition?: LivePosition | null
}) {
  const [showAll, setShowAll] = useState(false)

  const valid = waypoints.filter(
    (w) => Number.isFinite(w.lat) && Number.isFinite(w.lon) && (w.lat !== 0 || w.lon !== 0)
  )

  const nearby = useMemo(() => {
    const points = [...valid.map((w) => ({ lat: w.lat, lon: w.lon }))]
    if (livePosition) points.push({ lat: livePosition.lat, lon: livePosition.lon })
    return nearbyRegionalFrequencies(points, NEARBY_RADIUS_NM, distanceNm, showAll)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valid, livePosition?.lat, livePosition?.lon, showAll])

  const hasRouteOrPosition = valid.length > 0 || !!livePosition

  return (
    <div className="radio-frequencies">
      <p className="footnote radio-833-note">
        8.33 kHz channel spacing has been mandatory below FL195 in Norway and Sweden since 2018
        &mdash; always tune the exact published frequency to three decimal places, not rounded to
        the older 25 kHz grid.
      </p>

      <p className="panel-sublabel">Along your route</p>
      {valid.length === 0 ? (
        <p className="empty-hint">Add waypoints to see any confirmed frequencies for them.</p>
      ) : (
        <div className="freq-waypoint-list">
          {valid.map((wp) => (
            <div className="freq-waypoint-card" key={wp.id}>
              <p className="freq-waypoint-name">{wp.name || `${wp.lat.toFixed(4)}, ${wp.lon.toFixed(4)}`}</p>
              {wp.frequencies && wp.frequencies.length > 0 ? (
                wp.frequencies.map((f, i) => (
                  <div className="freq-row" key={i}>
                    <span className="freq-type">{f.type}</span>
                    <span className="freq-mhz">{formatMhz(f.mhz)}</span>
                    {f.note && <span className="freq-note">{f.note}</span>}
                  </div>
                ))
              ) : (
                <p className="freq-unconfirmed">
                  No confirmed frequency in this app's data &mdash; check the current AIP (Norway:
                  ippc.no) or ask locally before you fly.
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="freq-nearby-header">
        <p className="panel-sublabel freq-nearby-sublabel">
          {showAll ? 'All controlled airspace/airports' : `Nearby controlled airspace/airports (within ${NEARBY_RADIUS_NM} nm)`}
        </p>
        <button type="button" className="freq-showall-btn" onClick={() => setShowAll((s) => !s)}>
          {showAll ? 'Show nearby only' : 'Show all'}
        </button>
      </div>
      {!hasRouteOrPosition && !showAll && (
        <p className="empty-hint">
          Polaris Control FIS sectors are always listed below (they cover huge areas, so distance
          doesn't apply the same way) &mdash; add a route or start GPS tracking to also see nearby
          airports, or tap "Show all".
        </p>
      )}
      <div className="freq-waypoint-list">
        {nearby.map((f) => (
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
            {f.note && <span className="freq-note">{f.note}</span>}
          </div>
        ))}
      </div>
      <p className="footnote">
        This regional list was provided and confirmed by a user citing official Avinor AIP charts.
        I independently spot-checked the Bergen (ENBR) entries against the exact chart cited and
        they matched precisely &mdash; the rest wasn't individually re-verified by me beyond that.
        AIRAC cycles change frequencies periodically, so cross-check before relying on this
        operationally.
      </p>

      <p className="panel-sublabel">General reference (not airfield-specific)</p>
      <div className="freq-waypoint-list">
        {REFERENCE_FREQUENCIES.map((f) => (
          <div className="freq-row freq-row-reference" key={f.label}>
            <span className="freq-type">
              {f.label} <span className="freq-scope">({f.scope})</span>
              {f.source === 'user-reported' && (
                <span className="freq-unverified-tag">unverified</span>
              )}
            </span>
            <span className="freq-mhz">{formatMhz(f.mhz)}</span>
            <span className="freq-note">{f.note}</span>
          </div>
        ))}
      </div>

      <p className="footnote">
        Only frequencies I could confirm or that were explicitly given to me are shown here
        &mdash; nothing here is guessed. This is not a substitute for the current AIP, and
        frequencies can change.
      </p>
    </div>
  )
}
