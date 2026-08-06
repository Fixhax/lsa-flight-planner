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

// Wide rectangular frame (rather than a circular attitude-ball bezel) —
// closer to a real wide-format PFD, and gives more horizontal room
// before a target's bearing line runs off the visible edge.
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
  invertSlipSkid: boolean
}

function loadCalibration(): Calibration {
  try {
    const raw = localStorage.getItem(CALIBRATION_KEY)
    if (!raw) return { invertPitch: false, invertRoll: false, swapAxes: false, invertSlipSkid: false }
    const parsed = JSON.parse(raw) as Partial<Calibration>
    return {
      invertPitch: !!parsed.invertPitch,
      invertRoll: !!parsed.invertRoll,
      swapAxes: !!parsed.swapAxes,
      invertSlipSkid: !!parsed.invertSlipSkid
    }
  } catch {
    return { invertPitch: false, invertRoll: false, swapAxes: false, invertSlipSkid: false }
  }
}

// Turn coordinator constants. The face is calibrated so the wingtip
// symbol aligns with a fixed reference dot at exactly standard rate (3
// deg/sec, the universal "2-minute turn" convention) — TC_VISUAL_DEG_PER_STANDARD_RATE
// is how far the symbol itself rotates at that rate, which is a display
// convention, not a real bank angle (a turn coordinator has never shown
// actual bank — only a real attitude indicator does that).
const STANDARD_RATE_DEG_PER_SEC = 3
const TC_VISUAL_DEG_PER_STANDARD_RATE = 20
const TC_MAX_VISUAL_DEG = 35
const TC_CX = 100
const TC_CY = 50
const TC_WING_HALF_LEN = 38
const GRAVITY_MPS2 = 9.80665
const KT_TO_MPS = 0.514444
// Below this, ground speed is too slow/noisy (taxiing, stationary testing)
// for the coordination math to mean anything real.
const MIN_SPEED_FOR_COORDINATION_KT = 20
const BALL_PX_PER_DEG = 6
const BALL_MAX_TRAVEL_PX = 50

export default function AttitudeBearing({
  waypoints,
  livePosition,
  engineOutTarget,
  gpsTracking,
  onStartGps
}: Props) {
  const [active, setActive] = useState(true)
  const { permission, orientation, heading, turnRateDegPerSec, error, requestPermission } =
    useDeviceOrientation(active)
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
  const [invertSlipSkid, setInvertSlipSkid] = useState(initialCalibration.current.invertSlipSkid)
  const [manualTargetId, setManualTargetId] = useState('auto')

  useEffect(() => {
    try {
      localStorage.setItem(
        CALIBRATION_KEY,
        JSON.stringify({ invertPitch: invert.pitch, invertRoll: invert.roll, swapAxes, invertSlipSkid })
      )
    } catch {
      // ignore — private browsing or storage full; just won't stick next time
    }
  }, [invert.pitch, invert.roll, swapAxes, invertSlipSkid])

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

  // Turn coordinator. The banking-symbol part just needs turn rate, which
  // useDeviceOrientation already provides. The slip/skid ball needs more:
  // in a properly coordinated turn, bank angle and turn rate aren't
  // independent — tan(bank) = (turn rate * true airspeed) / g — so the gap
  // between your ACTUAL bank (already computed above, as `roll`) and the
  // bank THAT turn rate would call for at your current speed is exactly
  // what a slip/skid ball measures, without needing to guess which raw
  // accelerometer axis is "lateral" for however the phone happens to be
  // mounted (there isn't a clean way to isolate that from a single static
  // gravity reading — see the confidence-weighting note in
  // useDeviceOrientation for why). True airspeed isn't available from a
  // phone, so this uses GPS ground speed as an approximation — wind means
  // it won't always be exact, but it's close enough at typical LSA speeds
  // for this to be meaningfully more informative than nothing.
  const groundSpeedKt = livePosition?.speedKt
  const hasSpeedForCoordination =
    groundSpeedKt !== undefined && groundSpeedKt >= MIN_SPEED_FOR_COORDINATION_KT
  const coordinatedBankDeg =
    turnRateDegPerSec !== null && hasSpeedForCoordination
      ? (Math.atan(
          (((turnRateDegPerSec * Math.PI) / 180) * (groundSpeedKt! * KT_TO_MPS)) / GRAVITY_MPS2
        ) *
          180) /
        Math.PI
      : null
  const slipSkidDeg =
    coordinatedBankDeg !== null ? (roll - coordinatedBankDeg) * (invertSlipSkid ? -1 : 1) : null

  const turnRateVisualDeg =
    turnRateDegPerSec !== null
      ? Math.max(
          -TC_MAX_VISUAL_DEG,
          Math.min(
            TC_MAX_VISUAL_DEG,
            (turnRateDegPerSec / STANDARD_RATE_DEG_PER_SEC) * TC_VISUAL_DEG_PER_STANDARD_RATE
          )
        )
      : 0
  const stdRateRad = (TC_VISUAL_DEG_PER_STANDARD_RATE * Math.PI) / 180
  const stdRateDotRight = {
    x: TC_CX + TC_WING_HALF_LEN * Math.cos(stdRateRad),
    y: TC_CY + TC_WING_HALF_LEN * Math.sin(stdRateRad)
  }
  const stdRateDotLeft = {
    x: TC_CX - TC_WING_HALF_LEN * Math.cos(stdRateRad),
    y: TC_CY + TC_WING_HALF_LEN * Math.sin(stdRateRad)
  }
  const ballOffsetPx =
    slipSkidDeg !== null
      ? Math.max(-BALL_MAX_TRAVEL_PX, Math.min(BALL_MAX_TRAVEL_PX, slipSkidDeg * BALL_PX_PER_DEG))
      : 0

  if (!active) {
    return (
      <button type="button" className="live-tracking-btn" onClick={() => setActive(true)}>
        Show attitude &amp; bearing
      </button>
    )
  }

  if (permission === 'unsupported') {
    return (
      <p className="empty-hint">
        This device or browser doesn't expose orientation sensors — attitude &amp; bearing isn't
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
      <div className="attitude-bearing-target-picker">
        <label htmlFor="ab-target">Target</label>
        <select id="ab-target" value={manualTargetId} onChange={(e) => setManualTargetId(e.target.value)}>
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
        aria-label="Attitude horizon"
      >
        <defs>
          <clipPath id="ab-bezel-clip">
            <rect x="8" y="8" width={VIEW_W - 16} height={VIEW_H - 16} rx="14" />
          </clipPath>
        </defs>

        <g clipPath="url(#ab-bezel-clip)">
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
          <polygon points={`${CENTER_X},12 ${CENTER_X - 6},24 ${CENTER_X + 6},24`} fill="#fff" />
        </g>

        {/* Target bearing line — a single indicator, deliberately fixed to
            the screen (not rotated with bank), unlike the horizon/pitch
            ladder above it. An earlier version used a horizon-space dot
            (rotating with bank, like a real point out the windscreen)
            *and* a separate screen-fixed rim arrow at the same time — the
            two answer different questions (attitude vs. heading) and so
            visibly diverge from each other under any bank angle, which
            read as broken rather than as two correct-but-different things.
            One consistent reference frame instead: this line always means
            "turn toward here," full stop. Positioned purely by relative
            bearing (heading to target minus your current heading); clipped
            by the same frame as the horizon, so it naturally disappears
            when the target isn't roughly ahead — the numeric bearing in
            the readout below still works even then. */}
        {relativeBearingDeg !== null && (
          <g clipPath="url(#ab-bezel-clip)">
            <line
              x1={CENTER_X + relativeBearingDeg * PX_PER_DEG}
              y1="14"
              x2={CENTER_X + relativeBearingDeg * PX_PER_DEG}
              y2={VIEW_H - 14}
              stroke="#4fd1c5"
              strokeWidth="2.5"
            />
            <polygon
              points={`${CENTER_X + relativeBearingDeg * PX_PER_DEG},14 ${CENTER_X + relativeBearingDeg * PX_PER_DEG - 6},24 ${CENTER_X + relativeBearingDeg * PX_PER_DEG + 6},24`}
              fill="#4fd1c5"
            />
          </g>
        )}

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

      <svg
        viewBox="0 0 200 130"
        className="turn-coordinator"
        role="img"
        aria-label="Turn coordinator"
      >
        <rect x="4" y="4" width="192" height="72" rx="10" fill="#1d2532" stroke="#0d1117" strokeWidth="3" />

        {/* Fixed wings-level reference — the symbol below rests here at
            zero turn rate. */}
        <g stroke="#666" strokeWidth="2">
          <line x1={TC_CX - TC_WING_HALF_LEN - 4} y1={TC_CY} x2={TC_CX - TC_WING_HALF_LEN + 6} y2={TC_CY} />
          <line x1={TC_CX + TC_WING_HALF_LEN - 6} y1={TC_CY} x2={TC_CX + TC_WING_HALF_LEN + 4} y2={TC_CY} />
        </g>

        {/* Standard-rate (3 deg/sec, the universal "2-minute turn") dots —
            the wingtip aligns with one of these at exactly that rate. This
            is a display convention, same as a real turn coordinator: the
            symbol's rotation represents turn RATE, not actual bank angle,
            even though it's drawn as a banking aircraft. */}
        <circle cx={stdRateDotLeft.x} cy={stdRateDotLeft.y} r="3" fill="#ffb703" />
        <circle cx={stdRateDotRight.x} cy={stdRateDotRight.y} r="3" fill="#ffb703" />

        <g className="tc-needle" transform={`rotate(${turnRateVisualDeg} ${TC_CX} ${TC_CY})`}>
          <rect
            x={TC_CX - TC_WING_HALF_LEN}
            y={TC_CY - 3}
            width={TC_WING_HALF_LEN * 2}
            height="6"
            rx="3"
            fill="#fff"
          />
          <rect x={TC_CX - 3} y={TC_CY - 20} width="6" height="20" rx="2" fill="#fff" />
        </g>
        <circle cx={TC_CX} cy={TC_CY} r="4" fill="#ffcc00" />

        {/* Slip/skid ball — see the comment above where slipSkidDeg is
            computed for what it actually measures. Grey/centered rather
            than hidden when there's no speed/turn-rate data to compute it
            from, so the gauge doesn't jump in and out of existence. */}
        <rect x="60" y="94" width="80" height="20" rx="10" fill="#0d1117" stroke="#444" strokeWidth="1.5" />
        <line x1="88" y1="94" x2="88" y2="114" stroke="#444" strokeWidth="1.5" />
        <line x1="112" y1="94" x2="112" y2="114" stroke="#444" strokeWidth="1.5" />
        <g className="tc-ball" transform={`translate(${ballOffsetPx} 0)`}>
          <circle
            cx="100"
            cy="104"
            r="7"
            fill={slipSkidDeg !== null ? '#fff' : '#555'}
            stroke="#0d1117"
            strokeWidth="1.5"
          />
        </g>
      </svg>

      <div className="attitude-readout">
        <span>
          Turn{' '}
          {turnRateDegPerSec !== null
            ? `${Math.abs(turnRateDegPerSec).toFixed(1)}°/s ${turnRateDegPerSec >= 0 ? 'R' : 'L'} (${(Math.abs(turnRateDegPerSec) / STANDARD_RATE_DEG_PER_SEC).toFixed(1)}x std)`
            : '—'}
        </span>
        <span>
          Slip/skid{' '}
          {slipSkidDeg !== null
            ? `${slipSkidDeg >= 0 ? '+' : ''}${slipSkidDeg.toFixed(1)}°`
            : hasSpeedForCoordination
              ? '—'
              : 'need GPS speed'}
        </span>
      </div>

      {target && (
        <div className="attitude-bearing-target-readout">
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
              <button type="button" className="attitude-bearing-gps-btn" onClick={onStartGps}>
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
        <button type="button" className="attitude-bearing-gps-btn" onClick={onStartGps}>
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
        <label className="checkbox-field attitude-invert">
          <input
            type="checkbox"
            checked={invertSlipSkid}
            onChange={(e) => setInvertSlipSkid(e.target.checked)}
          />
          Invert slip/skid
        </label>
      </div>

      <button type="button" className="attitude-close-btn" onClick={() => setActive(false)}>
        Close attitude &amp; bearing
      </button>

      <p className="footnote">
        Reference only — derived from this device's motion sensors and GPS, not a certified flight
        instrument (no terrain is rendered — the vertical line is just a bearing pointer toward the
        selected target's coordinates; distance and altitude difference are numbers in the readout
        below it, not part of the graphic). Never rely on this instead of proper training, visual
        reference, or certified panel instruments. "Level / center" sets the device's current
        orientation as zero. Invert/swap settings are remembered on this device, so you shouldn't need
        to reset them every session — "Level / center" still resets each time you open this, since
        re-leveling before flight is good practice regardless of mount.
      </p>
      <p className="footnote">
        The turn coordinator's rate needle is derived from how fast the compass heading is changing,
        not a raw gyroscope reading — same reasoning as the bearing line above, sidesteps needing to
        know which axis is "yaw" for whatever way the phone is mounted. The slip/skid ball compares
        your actual bank to the bank a coordinated turn would need at your current turn rate and GPS
        ground speed (used as a stand-in for true airspeed, since a phone has no way to measure that
        directly — close enough at typical LSA speeds, but not exact). Needs GPS speed above ~20kt to
        mean anything; shows as a grey centered ball below that. If it reads backwards for how your
        device is mounted, "Invert slip/skid" above flips it.
      </p>
    </div>
  )
}
