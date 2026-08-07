import { useState } from 'react'
import { useDeviceOrientation } from '../hooks/useDeviceOrientation'
import { distanceNm, trueCourse, type LatLon } from '../lib/geo'
import type { Waypoint } from '../lib/planning'
import type { LivePosition } from '../lib/liveTracking'
import type { EngineOutTarget } from '../lib/engineOut'
import { airstrips } from '../data/strips'

interface Props {
  waypoints: Waypoint[]
  livePosition: LivePosition | null
  engineOutTarget: EngineOutTarget | null
  gpsTracking: boolean
  onStartGps: () => void
}

const VIEW = 200
const CENTER = 100
const BEZEL_R = 88
const CARD_R = 78

function pointAt(deg: number, radius: number) {
  // 0deg points straight up, positive sweeps clockwise — matches compass
  // convention (N=0, E=90) and relative-bearing convention (target to the
  // right = positive) used elsewhere in this app.
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: CENTER + radius * Math.cos(rad), y: CENTER + radius * Math.sin(rad) }
}

interface Target extends LatLon {
  name: string
  elevationFt?: number
}

export default function Bearing({
  waypoints,
  livePosition,
  engineOutTarget,
  gpsTracking,
  onStartGps
}: Props) {
  const [active, setActive] = useState(true)
  const { permission, heading, diagnostics, error, requestPermission } = useDeviceOrientation(active)
  const [manualTargetId, setManualTargetId] = useState('auto')

  // GPS course-over-ground doesn't need a magnetometer at all, just
  // movement — a genuinely independent heading source from the compass
  // above, and worth falling back to on devices whose compass never gives
  // a usable reading (common on tablets, some of which have no
  // magnetometer chip at all). It's compass heading (nose direction) when
  // available since that's meaningful even standing still; GPS track
  // (direction of travel) only when moving, and only as a stand-in — the
  // two aren't the same thing in a crosswind, so this is clearly labeled
  // as a fallback, not silently substituted.
  const gpsTrack = livePosition?.headingDeg
  const usingGpsFallback = heading === null && gpsTrack !== undefined
  const effectiveHeading = heading ?? gpsTrack ?? null

  const validWaypoints = waypoints.filter(
    (w) => Number.isFinite(w.lat) && Number.isFinite(w.lon) && (w.lat !== 0 || w.lon !== 0)
  )

  const autoTarget: Target | null = engineOutTarget
    ? {
        name: engineOutTarget.strip.name,
        lat: engineOutTarget.strip.lat,
        lon: engineOutTarget.strip.lon,
        elevationFt: engineOutTarget.strip.elevationFt
      }
    : validWaypoints.length > 0
      ? (() => {
          const d = validWaypoints[validWaypoints.length - 1]
          return { name: d.name || 'Destination', lat: d.lat, lon: d.lon, elevationFt: d.elevationFt }
        })()
      : null

  // Plain computed value rather than a memo — cheap enough to redo every
  // render, and a memo keyed only on manualTargetId would go stale if a
  // selected waypoint's position changes (e.g. dragged on the map) without
  // the selection itself changing.
  let target: Target | null = autoTarget
  if (manualTargetId !== 'auto') {
    const wp = validWaypoints.find((w) => `wp-${w.id}` === manualTargetId)
    const strip = airstrips.find((s) => `af-${s.id}` === manualTargetId)
    if (wp) target = { name: wp.name || 'Waypoint', lat: wp.lat, lon: wp.lon, elevationFt: wp.elevationFt }
    else if (strip) target = { name: strip.name, lat: strip.lat, lon: strip.lon, elevationFt: strip.elevationFt }
  }

  const targetInfo =
    target && livePosition
      ? { distanceNm: distanceNm(livePosition, target), bearingDeg: trueCourse(livePosition, target) }
      : null

  const relativeBearingDeg =
    targetInfo && effectiveHeading !== null
      ? (((targetInfo.bearingDeg - effectiveHeading + 540) % 360) - 180)
      : null

  const altDiffFt =
    target?.elevationFt !== undefined && livePosition?.altitudeFt !== undefined
      ? target.elevationFt - livePosition.altitudeFt
      : null

  const headingHint =
    heading === null && permission === 'granted'
      ? !diagnostics.sawEvent
        ? "No orientation sensor detected on this device — heading/bearing here will have to come from GPS track instead, once you're moving."
        : !diagnostics.sawAbsolute
          ? "This device reports an orientation sensor, but it isn't giving a calibrated compass heading — try moving it in a slow figure-8 to calibrate the magnetometer, or check its location/compass settings. Some tablets have no magnetometer at all, in which case this won't resolve."
          : null
      : null

  if (!active) {
    return (
      <button type="button" className="live-tracking-btn" onClick={() => setActive(true)}>
        Show bearing &amp; track
      </button>
    )
  }

  if (permission === 'unsupported') {
    return (
      <p className="empty-hint">
        This device or browser doesn't expose orientation sensors — compass heading isn't available
        here, though GPS track/bearing still work once GPS is on.
      </p>
    )
  }

  if (permission !== 'granted') {
    return (
      <div className="bearing-permission">
        <button type="button" className="live-tracking-btn" onClick={requestPermission}>
          {permission === 'requesting' ? 'Requesting…' : 'Enable compass'}
        </button>
        {error && <p className="auth-error">{error}</p>}
      </div>
    )
  }

  return (
    <div className="bearing-wrap">
      <div className="bearing-target-picker">
        <label htmlFor="brg-target">Target</label>
        <select id="brg-target" value={manualTargetId} onChange={(e) => setManualTargetId(e.target.value)}>
          <option value="auto">
            Auto ({engineOutTarget ? 'engine-out target' : autoTarget ? 'destination' : 'none set'})
          </option>
          {validWaypoints.length > 0 && (
            <optgroup label="Route waypoints">
              {validWaypoints.map((w) => (
                <option key={w.id} value={`wp-${w.id}`}>
                  {w.name || 'Unnamed waypoint'}
                </option>
              ))}
            </optgroup>
          )}
          <optgroup label="Curated airfields">
            {airstrips.map((s) => (
              <option key={s.id} value={`af-${s.id}`}>
                {s.name}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      <svg viewBox={`0 0 ${VIEW} ${VIEW}`} className="bearing-dial" role="img" aria-label="Bearing dial">
        <circle cx={CENTER} cy={CENTER} r={BEZEL_R} fill="#1d2532" stroke="#0d1117" strokeWidth="4" />

        {/* Rotating compass card — behaves like a real magnetic compass:
            the ring of cardinal letters turns opposite to your heading so
            they always sit at their true compass position, while the nose
            marker below stays fixed pointing up. */}
        <g transform={effectiveHeading !== null ? `rotate(${-effectiveHeading} ${CENTER} ${CENTER})` : undefined}>
          {Array.from({ length: 12 }, (_, i) => i * 30).map((deg) => {
            const outer = pointAt(deg, CARD_R)
            const inner = pointAt(deg, deg % 90 === 0 ? CARD_R - 12 : CARD_R - 6)
            return (
              <line
                key={deg}
                x1={outer.x}
                y1={outer.y}
                x2={inner.x}
                y2={inner.y}
                stroke="#888"
                strokeWidth={deg % 90 === 0 ? 2 : 1}
              />
            )
          })}
          {[
            { deg: 0, label: 'N' },
            { deg: 90, label: 'E' },
            { deg: 180, label: 'S' },
            { deg: 270, label: 'W' }
          ].map(({ deg, label }) => {
            const p = pointAt(deg, CARD_R - 22)
            return (
              <text
                key={label}
                x={p.x}
                y={p.y + 5}
                fill={label === 'N' ? '#ff6b6b' : '#ddd'}
                fontSize="14"
                fontWeight="700"
                textAnchor="middle"
              >
                {label}
              </text>
            )
          })}
        </g>

        {/* Fixed nose/lubber marker — this is always "ahead" regardless of
            heading, same convention as a real panel-mount compass. */}
        <polygon points={`${CENTER},16 ${CENTER - 6},28 ${CENTER + 6},28`} fill="#fff" />

        {/* Bearing needle — points at the selected target's relative
            bearing. A single indicator in one consistent reference frame
            (screen-fixed rotation, not the compass card's), so it can't
            visually diverge from itself the way an earlier two-marker
            version of this gauge did. */}
        {relativeBearingDeg !== null && (
          <g transform={`rotate(${relativeBearingDeg} ${CENTER} ${CENTER})`}>
            <line x1={CENTER} y1={CENTER} x2={CENTER} y2={CENTER - 62} stroke="#4fd1c5" strokeWidth="3" />
            <polygon
              points={`${CENTER},${CENTER - 70} ${CENTER - 7},${CENTER - 56} ${CENTER + 7},${CENTER - 56}`}
              fill="#4fd1c5"
            />
          </g>
        )}
        <circle cx={CENTER} cy={CENTER} r="5" fill="#ffcc00" stroke="#0d1117" strokeWidth="1.5" />
      </svg>

      <div className="bearing-readout">
        <span>
          Hdg {heading !== null ? `${Math.round(heading)}°` : '—'}
        </span>
        <span>Trk {gpsTrack !== undefined ? `${Math.round(gpsTrack)}°` : '—'}</span>
        <span>
          Brg{' '}
          {relativeBearingDeg !== null
            ? `${Math.abs(relativeBearingDeg).toFixed(0)}° ${relativeBearingDeg >= 0 ? 'R' : 'L'}`
            : '—'}
        </span>
      </div>
      {usingGpsFallback && (
        <p className="footnote">
          Compass heading unavailable — Hdg/Brg above are from GPS track instead, so they only update
          while you're actually moving.
        </p>
      )}
      {headingHint && <p className="footnote">{headingHint}</p>}

      {target && (
        <div className="bearing-target-readout">
          <strong>{target.name}</strong>
          {targetInfo ? (
            <span>
              {targetInfo.distanceNm.toFixed(1)} nm
              {relativeBearingDeg !== null &&
                ` · ${Math.abs(relativeBearingDeg).toFixed(0)}° ${relativeBearingDeg >= 0 ? 'right' : 'left'}`}
              {altDiffFt !== null && ` · ${altDiffFt >= 0 ? '+' : ''}${Math.round(altDiffFt)} ft`}
            </span>
          ) : (
            !livePosition && (
              <button type="button" className="bearing-gps-btn" onClick={onStartGps}>
                Turn on GPS for distance/bearing
              </button>
            )
          )}
          {targetInfo && effectiveHeading === null && (
            <span>No heading source available — no bearing pointer, distance only.</span>
          )}
        </div>
      )}

      {!gpsTracking && !target && (
        <button type="button" className="bearing-gps-btn" onClick={onStartGps}>
          Turn on GPS tracking
        </button>
      )}

      <button type="button" className="bearing-close-btn" onClick={() => setActive(false)}>
        Close bearing &amp; track
      </button>

      <p className="footnote">
        Reference only, not a certified flight instrument — a computed bearing pointer toward known
        coordinates, not a rendered view (it can't know about hills, towers, or anything else between
        you and the target). Distance and altitude difference are numbers in the readout above, not
        part of the dial itself, so they're still there even when the needle isn't showing.
      </p>
    </div>
  )
}
