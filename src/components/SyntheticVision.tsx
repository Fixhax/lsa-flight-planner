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
  gpsTracking: boolean
  onStartGps: () => void
}

const PITCH_LADDER = [-60, -50, -40, -30, -20, -10, 10, 20, 30, 40, 50, 60]
const BANK_TICKS = [-60, -45, -30, -20, -10, 0, 10, 20, 30, 45, 60]
const PX_PER_DEG = 2.6
const FT_PER_NM = 6076.12

// Wide rectangular frame (rather than a circular attitude-ball bezel) —
// closer to how a real wide-format PFD/synthetic-vision display looks,
// and gives more horizontal room before a target marker runs off the
// visible edge.
const VIEW_W = 300
const VIEW_H = 180
const CENTER_X = 150
const CENTER_Y = 90

function arcPoint(deg: number, radius: number, cx = CENTER_X, cy = CENTER_Y) {
  // 0° points straight up; positive degrees sweep clockwise, matching
  // both the bank scale (bank right = positive) and relative-bearing
  // convention (target to the right = positive) used elsewhere here.
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) }
}

interface Target extends LatLon {
  name: string
  elevationFt?: number
}

const CALIBRATION_KEY = 'lsa-planner-sv-calibration'

interface Calibration {
  invertPitch: boolean
  invertRoll: boolean
  swapAxes: boolean
}

function loadCalibration(): Calibration {
  try {
    const raw = localStorage.getItem(CALIBRATION_KEY)
    if (!raw) return { invertPitch: false, invertRoll: false, swapAxes: false }
    const parsed = JSON.parse(raw) as Partial<Calibration>
    return {
      invertPitch: !!parsed.invertPitch,
      invertRoll: !!parsed.invertRoll,
      swapAxes: !!parsed.swapAxes
    }
  } catch {
    return { invertPitch: false, invertRoll: false, swapAxes: false }
  }
}

export default function SyntheticVision({
  waypoints,
  livePosition,
  engineOutTarget,
  gpsTracking,
  onStartGps
}: Props) {
  const [active, setActive] = useState(true)
  const { permission, orientation, heading, error, requestPermission } = useDeviceOrientation(active)
  const [offset, setOffset] = useState({ pitch: 0, roll: 0 })
  // How the device's sensor axes relate to how it's actually mounted
  // (yoke, kneeboard, flat on a seat, etc.) is a fixed fact about that
  // device/browser, not something that should need re-discovering every
  // time this panel opens — persisted so it sticks across sessions on
  // this device. Deliberately NOT persisting the level/center offset
  // below, since re-leveling before each flight is expected regardless.
  const initialCalibration = useRef(loadCalibration())
  const [invert, setInvert] = useState({
    pitch: initialCalibration.current.invertPitch,
    roll: initialCalibration.current.invertRoll
  })
  const [swapAxes, setSwapAxes] = useState(initialCalibration.current.swapAxes)
  const [manualTargetId, setManualTargetId] = useState('auto')

  useEffect(() => {
    try {
      localStorage.setItem(
        CALIBRATION_KEY,
        JSON.stringify({ invertPitch: invert.pitch, invertRoll: invert.roll, swapAxes })
      )
    } catch {
      // ignore — private browsing or storage full; just won't stick next time
    }
  }, [invert.pitch, invert.roll, swapAxes])

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

      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="attitude-indicator"
        role="img"
        aria-label="Synthetic vision horizon"
      >
        <defs>
          <clipPath id="sv-bezel-clip">
            <rect x="8" y="8" width={VIEW_W - 16} height={VIEW_H - 16} rx="14" />
          </clipPath>
        </defs>

        <g clipPath="url(#sv-bezel-clip)">
          <g transform={`rotate(${-roll} ${CENTER_X} ${CENTER_Y}) translate(0 ${CENTER_Y + translateY})`}>
            <rect x="-300" y="-600" width="900" height="600" fill="#3b82c4" />
            <rect x="-300" y="0" width="900" height="600" fill="#8a5a34" />
            <line x1="-300" y1="0" x2="600" y2="0" stroke="#fff" strokeWidth="2" />
            {PITCH_LADDER.map((deg) => (
              <g key={deg} transform={`translate(0 ${-deg * PX_PER_DEG})`}>
                <line
                  x1={CENTER_X + (deg % 20 === 0 ? -45 : -25)}
                  y1="0"
                  x2={CENTER_X + (deg % 20 === 0 ? 45 : 25)}
                  y2="0"
                  stroke="#fff"
                  strokeWidth="1.5"
                />
                {deg % 20 === 0 && (
                  <>
                    <text x={CENTER_X - 58} y="4" fill="#fff" fontSize="9" textAnchor="middle">
                      {Math.abs(deg)}
                    </text>
                    <text x={CENTER_X + 58} y="4" fill="#fff" fontSize="9" textAnchor="middle">
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
                disappears off the frame when the target isn't roughly
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
          const outer = arcPoint(deg, 80)
          const inner = arcPoint(deg, deg === 0 ? 66 : 72)
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

        <g transform={`rotate(${-roll} ${CENTER_X} ${CENTER_Y})`}>
          <polygon
            points={`${CENTER_X},12 ${CENTER_X - 6},24 ${CENTER_X + 6},24`}
            fill="#fff"
          />
        </g>

        {/* Rim arrow — always shows which way to turn toward the target,
            fixed to the screen (not rotated with bank) since it answers a
            heading question, not an attitude one. Visible even when the
            target is well outside the horizon view above (behind you, or
            far to one side). */}
        {relativeBearingDeg !== null &&
          (() => {
            const tip = arcPoint(relativeBearingDeg, 84)
            const left = arcPoint(relativeBearingDeg - 6, 72)
            const right = arcPoint(relativeBearingDeg + 6, 72)
            return (
              <polygon
                points={`${tip.x},${tip.y} ${left.x},${left.y} ${right.x},${right.y}`}
                fill="#4fd1c5"
                stroke="#0d1117"
                strokeWidth="1"
              />
            )
          })()}

        <rect
          x="8"
          y="8"
          width={VIEW_W - 16}
          height={VIEW_H - 16}
          rx="14"
          fill="none"
          stroke="#0d1117"
          strokeWidth="5"
        />
        <g stroke="#ffcc00" strokeWidth="4.5" fill="none" strokeLinecap="round">
          <line x1={CENTER_X - 82} y1={CENTER_Y} x2={CENTER_X - 14} y2={CENTER_Y} />
          <line x1={CENTER_X + 14} y1={CENTER_Y} x2={CENTER_X + 82} y2={CENTER_Y} />
          <polyline points={`${CENTER_X - 14},${CENTER_Y} ${CENTER_X - 14},${CENTER_Y + 10}`} />
          <polyline points={`${CENTER_X + 14},${CENTER_Y} ${CENTER_X + 14},${CENTER_Y + 10}`} />
        </g>
        <circle cx={CENTER_X} cy={CENTER_Y} r="4" fill="#ffcc00" />
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
              {altDiffFt !== null && ` · ${altDiffFt >= 0 ? '+' : ''}${Math.round(altDiffFt)} ft`}
            </span>
          ) : (
            !livePosition && (
              <button type="button" className="synthetic-vision-gps-btn" onClick={onStartGps}>
                Turn on GPS for distance/bearing
              </button>
            )
          )}
          {targetInfo && heading === null && (
            <span>Compass unavailable on this device — no bearing pointer, distance only.</span>
          )}
        </div>
      )}

      {!gpsTracking && !target && (
        <button type="button" className="synthetic-vision-gps-btn" onClick={onStartGps}>
          Turn on GPS tracking
        </button>
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
        instruments. "Level / center" sets the device's current orientation as zero. Invert/swap
        settings are remembered on this device, so you shouldn't need to reset them every session —
        "Level / center" still resets each time you open this, since re-leveling before flight is
        good practice regardless of mount.
      </p>
    </div>
  )
}
