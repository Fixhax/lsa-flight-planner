import { useEffect, useRef, useState } from 'react'
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
}

const PITCH_LADDER = [-60, -50, -40, -30, -20, -10, 10, 20, 30, 40, 50, 60]
const BANK_TICKS = [-60, -45, -30, -20, -10, 0, 10, 20, 30, 45, 60]
const PX_PER_DEG = 2.6
const FT_PER_NM = 6076.12

function bankTickPoint(deg: number, radius: number) {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: 100 + radius * Math.cos(rad), y: 100 + radius * Math.sin(rad) }
}

// Same trick as bankTickPoint, for the always-on-screen rim arrow that
// points toward the target regardless of whether its horizon marker is
// actually in view — fixed to the screen (0deg = straight up = "ahead"),
// not rotated with bank, since "which way to turn" is a heading-relative
// question, not a roll-relative one.
function rimPoint(relBearingDeg: number, radius: number) {
  const rad = ((relBearingDeg - 90) * Math.PI) / 180
  return { x: 100 + radius * Math.cos(rad), y: 100 + radius * Math.sin(rad) }
}

interface Target extends LatLon {
  name: string
  elevationFt?: number
}

export default function SyntheticVision({ waypoints, livePosition, engineOutTarget }: Props) {
  const [active, setActive] = useState(true)
  const { permission, orientation, heading, error, requestPermission } = useDeviceOrientation(active)
  const [offset, setOffset] = useState({ pitch: 0, roll: 0 })
  const [invert, setInvert] = useState({ pitch: false, roll: false })
  const [swapAxes, setSwapAxes] = useState(false)
  const [manualTargetId, setManualTargetId] = useState('auto')

  const rawPitch0 = orientation?.pitchDeg ?? 0
  const rawRoll0 = orientation?.rollDeg ?? 0
  const rawPitch = swapAxes ? rawRoll0 : rawPitch0
  const rawRoll = swapAxes ? rawPitch0 : rawRoll0
  const pitch = Math.max(-90, Math.min(90, (rawPitch - offset.pitch) * (invert.pitch ? -1 : 1)))
  const roll = (rawRoll - offset.roll) * (invert.roll ? -1 : 1)
  const translateY = pitch * PX_PER_DEG

  const recentRef = useRef<{ pitch: number; roll: number }[]>([])
  useEffect(() => {
    if (!orientation) return
    recentRef.current = [...recentRef.current, { pitch: rawPitch, roll: rawRoll }].slice(-15)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orientation, swapAxes])

  function handleLevel() {
    const samples = recentRef.current
    if (samples.length === 0) return
    const avgPitch = samples.reduce((s, v) => s + v.pitch, 0) / samples.length
    const avgRoll = samples.reduce((s, v) => s + v.roll, 0) / samples.length
    setOffset({ pitch: avgPitch, roll: avgRoll })
  }

  const validWaypoints = waypoints.filter(
    (w) => Number.isFinite(w.lat) && Number.isFinite(w.lon) && (w.lat !== 0 || w.lon !== 0)
  )

  // Auto-picks the engine-out target when that's active (it's the most
  // urgent thing to be looking for), else the route's destination — a
  // manual pick from the dropdown below always overrides either.
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
    targetInfo && heading !== null ? (((targetInfo.bearingDeg - heading + 540) % 360) - 180) : null

  const altDiffFt =
    target?.elevationFt !== undefined && livePosition?.altitudeFt !== undefined
      ? target.elevationFt - livePosition.altitudeFt
      : null

  const elevationAngleDeg =
    altDiffFt !== null && targetInfo && targetInfo.distanceNm > 0.01
      ? (Math.atan2(altDiffFt, targetInfo.distanceNm * FT_PER_NM) * 180) / Math.PI
      : 0

  const showMarker = relativeBearingDeg !== null

  if (!active) {
    return (
      <button type="button" className="live-tracking-btn" onClick={() => setActive(true)}>
        Show synthetic vision
      </button>
    )
  }

  if (permission === 'unsupported') {
    return (
      <p className="empty-hint">
        This device or browser doesn't expose orientation sensors — synthetic vision isn't
        available here.
      </p>
    )
  }

  if (permission !== 'granted') {
    return (
      <div className="attitude-permission">
        <button type="button" className="live-tracking-btn" onClick={requestPermission}>
          {permission === 'requesting' ? 'Requesting…' : 'Enable motion sensors'}
        </button>
        {error && <p className="auth-error">{error}</p>}
      </div>
    )
  }

  return (
    <div className="attitude-wrap">
      <div className="synthetic-vision-target-picker">
        <label htmlFor="sv-target">Target</label>
        <select id="sv-target" value={manualTargetId} onChange={(e) => setManualTargetId(e.target.value)}>
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

      <svg viewBox="0 0 200 200" className="attitude-indicator" role="img" aria-label="Synthetic vision horizon">
        <defs>
          <clipPath id="sv-bezel-clip">
            <circle cx="100" cy="100" r="88" />
          </clipPath>
        </defs>

        <g clipPath="url(#sv-bezel-clip)">
          <g transform={`rotate(${-roll} 100 100) translate(0 ${100 + translateY})`}>
            <rect x="-120" y="-420" width="440" height="420" fill="#3b82c4" />
            <rect x="-120" y="0" width="440" height="420" fill="#8a5a34" />
            <line x1="-120" y1="0" x2="320" y2="0" stroke="#fff" strokeWidth="2" />
            {PITCH_LADDER.map((deg) => (
              <g key={deg} transform={`translate(0 ${-deg * PX_PER_DEG})`}>
                <line
                  x1={deg % 20 === 0 ? 55 : 75}
                  y1="0"
                  x2={deg % 20 === 0 ? 145 : 125}
                  y2="0"
                  stroke="#fff"
                  strokeWidth="1.5"
                />
                {deg % 20 === 0 && (
                  <>
                    <text x="42" y="4" fill="#fff" fontSize="9" textAnchor="middle">
                      {Math.abs(deg)}
                    </text>
                    <text x="158" y="4" fill="#fff" fontSize="9" textAnchor="middle">
                      {Math.abs(deg)}
                    </text>
                  </>
                )}
              </g>
            ))}

            {/* Target marker — plotted in the same horizon-local space as
                the pitch ladder, so it moves with pitch/bank exactly like
                a real point out the windscreen would. Horizontal position
                is relative bearing (heading to target minus your current
                heading); vertical is the elevation angle to the target
                given its published field elevation vs your GPS altitude —
                falls back to sitting right on the horizon line when either
                altitude figure is unknown, rather than guessing. Naturally
                disappears off the bezel when the target isn't roughly
                ahead, same as extreme pitch ladder numbers already do. */}
            {showMarker && target && (
              <g transform={`translate(${relativeBearingDeg! * PX_PER_DEG} ${-elevationAngleDeg * PX_PER_DEG})`}>
                <circle r="6" fill="none" stroke="#4fd1c5" strokeWidth="2.5" />
                <circle r="2" fill="#4fd1c5" />
              </g>
            )}
          </g>
        </g>

        {BANK_TICKS.map((deg) => {
          const outer = bankTickPoint(deg, 88)
          const inner = bankTickPoint(deg, deg === 0 ? 74 : 80)
          return (
            <line
              key={deg}
              x1={outer.x}
              y1={outer.y}
              x2={inner.x}
              y2={inner.y}
              stroke="#ddd"
              strokeWidth={deg === 0 ? 2.5 : 1.5}
            />
          )
        })}

        <g transform={`rotate(${-roll} 100 100)`}>
          <polygon points="100,16 94,28 106,28" fill="#fff" />
        </g>

        {/* Rim arrow — always shows which way to turn toward the target,
            fixed to the screen (not rotated with bank) since it answers a
            heading question, not an attitude one. Visible even when the
            target is well outside the horizon view above (behind you, or
            far to one side). */}
        {relativeBearingDeg !== null &&
          (() => {
            const tip = rimPoint(relativeBearingDeg, 94)
            const left = rimPoint(relativeBearingDeg - 6, 82)
            const right = rimPoint(relativeBearingDeg + 6, 82)
            return (
              <polygon
                points={`${tip.x},${tip.y} ${left.x},${left.y} ${right.x},${right.y}`}
                fill="#4fd1c5"
                stroke="#0d1117"
                strokeWidth="1"
              />
            )
          })()}

        <circle cx="100" cy="100" r="88" fill="none" stroke="#0d1117" strokeWidth="5" />
        <g stroke="#ffcc00" strokeWidth="4.5" fill="none" strokeLinecap="round">
          <line x1="18" y1="100" x2="86" y2="100" />
          <line x1="114" y1="100" x2="182" y2="100" />
          <polyline points="86,100 86,110" />
          <polyline points="114,100 114,110" />
        </g>
        <circle cx="100" cy="100" r="4" fill="#ffcc00" />
      </svg>

      <div className="attitude-readout">
        <span>
          Pitch {pitch >= 0 ? '+' : ''}
          {pitch.toFixed(0)}&deg;
        </span>
        <span>
          Bank {roll >= 0 ? '+' : ''}
          {roll.toFixed(0)}&deg;
        </span>
        <span>Hdg {heading !== null ? `${Math.round(heading)}°` : '—'}</span>
      </div>

      {target && (
        <div className="synthetic-vision-target-readout">
          <strong>{target.name}</strong>
          {targetInfo ? (
            <span>
              {targetInfo.distanceNm.toFixed(1)} nm
              {relativeBearingDeg !== null &&
                ` · ${Math.abs(relativeBearingDeg).toFixed(0)}° ${relativeBearingDeg >= 0 ? 'right' : 'left'}`}
              {altDiffFt !== null &&
                ` · ${altDiffFt >= 0 ? '+' : ''}${Math.round(altDiffFt)} ft`}
            </span>
          ) : (
            <span>
              {!livePosition && 'Turn on GPS tracking (Live tracking panel) for distance/bearing.'}
            </span>
          )}
          {targetInfo && heading === null && (
            <span>Compass unavailable on this device — no bearing pointer, distance only.</span>
          )}
        </div>
      )}

      <div className="attitude-debug">
        raw xyz {orientation?.rawX.toFixed(1) ?? '—'} / {orientation?.rawY.toFixed(1) ?? '—'} /{' '}
        {orientation?.rawZ.toFixed(1) ?? '—'} · computed pitch/roll {rawPitch0.toFixed(1)}&deg; /{' '}
        {rawRoll0.toFixed(1)}&deg;
      </div>

      <div className="attitude-controls">
        <button type="button" className="fill-btn attitude-level-btn" onClick={handleLevel}>
          Level / center here
        </button>
        <label className="checkbox-field attitude-invert">
          <input
            type="checkbox"
            checked={invert.pitch}
            onChange={(e) => setInvert((prev) => ({ ...prev, pitch: e.target.checked }))}
          />
          Invert pitch
        </label>
        <label className="checkbox-field attitude-invert">
          <input
            type="checkbox"
            checked={invert.roll}
            onChange={(e) => setInvert((prev) => ({ ...prev, roll: e.target.checked }))}
          />
          Invert bank
        </label>
        <label className="checkbox-field attitude-invert">
          <input type="checkbox" checked={swapAxes} onChange={(e) => setSwapAxes(e.target.checked)} />
          Swap pitch/bank
        </label>
      </div>

      <button type="button" className="attitude-close-btn" onClick={() => setActive(false)}>
        Close synthetic vision
      </button>

      <p className="footnote">
        Reference only — derived from this device's motion sensors and GPS, not a certified flight
        instrument or real synthetic vision system (no terrain is rendered — just a bearing/elevation
        pointer toward the selected target, computed from its published coordinates and elevation).
        Never rely on this instead of proper training, visual reference, or certified panel
        instruments. "Level / center" sets the device's current orientation as zero. If pitch or bank
        moves the wrong way, or the two seem swapped, use the checkboxes above to correct it.
      </p>
    </div>
  )
}
