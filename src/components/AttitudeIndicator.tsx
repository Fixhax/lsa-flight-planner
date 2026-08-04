import { useEffect, useRef, useState } from 'react'
import { useDeviceOrientation } from '../hooks/useDeviceOrientation'

const PITCH_LADDER = [-60, -50, -40, -30, -20, -10, 10, 20, 30, 40, 50, 60]
const BANK_TICKS = [-60, -45, -30, -20, -10, 0, 10, 20, 30, 45, 60]
const PX_PER_DEG = 2.6

function bankTickPoint(deg: number, radius: number) {
  // 0° bank tick is straight up; ticks fan out either side along the bezel.
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: 100 + radius * Math.cos(rad), y: 100 + radius * Math.sin(rad) }
}

export default function AttitudeIndicator() {
  const { permission, orientation, error, requestPermission } = useDeviceOrientation()
  const [offset, setOffset] = useState({ pitch: 0, roll: 0 })
  // The exact sign of pitch/roll from raw device sensors depends on how the
  // device is physically mounted (screen-facing angle, yoke vs kneeboard,
  // etc.) — not something verifiable without the actual hardware in hand.
  // These let it be corrected on the device itself if it first appears
  // backward, rather than needing a code change.
  const [invert, setInvert] = useState({ pitch: false, roll: false })

  const rawPitch = orientation?.pitchDeg ?? 0
  const rawRoll = orientation?.rollDeg ?? 0
  const pitch = Math.max(
    -90,
    Math.min(90, (rawPitch - offset.pitch) * (invert.pitch ? -1 : 1))
  )
  const roll = (rawRoll - offset.roll) * (invert.roll ? -1 : 1)
  const translateY = pitch * PX_PER_DEG

  // Keeps the last ~15 readings so Level/Center can average them instead of
  // capturing whatever single sample happened to land at tap time — a tap
  // on the screen can itself nudge the device slightly, so one noisy
  // reading shouldn't become a lasting miscalibration.
  const recentRef = useRef<{ pitch: number; roll: number }[]>([])
  useEffect(() => {
    if (!orientation) return
    recentRef.current = [...recentRef.current, { pitch: orientation.pitchDeg, roll: orientation.rollDeg }].slice(-15)
  }, [orientation])

  function handleLevel() {
    const samples = recentRef.current
    if (samples.length === 0) return
    const avgPitch = samples.reduce((s, v) => s + v.pitch, 0) / samples.length
    const avgRoll = samples.reduce((s, v) => s + v.roll, 0) / samples.length
    setOffset({ pitch: avgPitch, roll: avgRoll })
  }

  if (permission === 'unsupported') {
    return (
      <p className="empty-hint">
        This device or browser doesn't expose orientation sensors — the attitude indicator isn't
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
      <svg viewBox="0 0 200 200" className="attitude-indicator" role="img" aria-label="Attitude indicator">
        <defs>
          <clipPath id="ai-bezel-clip">
            <circle cx="100" cy="100" r="88" />
          </clipPath>
        </defs>

        <g clipPath="url(#ai-bezel-clip)">
          <g transform={`rotate(${-roll} 100 100) translate(0 ${translateY})`}>
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
          </g>
        </g>

        {/* Fixed bank-angle scale, printed on the non-rotating bezel. */}
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

        {/* Rotating bank pointer, attached to the horizon's own rotation. */}
        <g transform={`rotate(${-roll} 100 100)`}>
          <polygon points="100,16 94,28 106,28" fill="#fff" />
        </g>

        {/* Fixed bezel ring and aircraft reference symbol — these never move.
            Wings deliberately span most of the gauge's width (matching real
            AI proportions) rather than a small stub in the middle, so it
            reads clearly at a glance instead of looking like a small,
            distant object in the middle of empty space. */}
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
        <span>Pitch {pitch >= 0 ? '+' : ''}{pitch.toFixed(0)}&deg;</span>
        <span>Bank {roll >= 0 ? '+' : ''}{roll.toFixed(0)}&deg;</span>
      </div>

      {/* Temporary diagnostic while tracking down the calibration issue —
          shows the unprocessed sensor values and the captured offset
          directly, so it's possible to see whether the raw values
          themselves are unstable versus a bug in the offset math. */}
      <div className="attitude-debug">
        raw beta/gamma {rawPitch.toFixed(1)}&deg; / {rawRoll.toFixed(1)}&deg; · offset{' '}
        {offset.pitch.toFixed(1)}&deg; / {offset.roll.toFixed(1)}&deg; · samples {recentRef.current.length}
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
      </div>

      <p className="footnote">
        Reference only — derived from this device's motion sensors, not a certified flight
        instrument. Never rely on this instead of proper training, visual reference, or (if
        equipped) certified panel instruments. "Level / center" sets the device's current
        orientation as zero, useful since a kneeboard or yoke mount is rarely perfectly level
        itself. If pitching or banking the device moves the horizon the wrong way for how it's
        mounted, use the invert checkboxes above to correct it.
      </p>
    </div>
  )
}
