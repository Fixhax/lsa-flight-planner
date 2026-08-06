import { useEffect, useRef, useState } from 'react'

// Exponential-moving-average smoothing factor for raw sensor readings —
// lower is smoother but laggier, higher is snappier but jitterier. Raw
// accelerometer/magnetometer readings on real phones are noisy enough
// (device motion events fire tens of times a second, each with a few
// degrees of scatter) that passing them straight through made the gauge
// visibly shaky rather than tracking smooth, real attitude changes.
const SMOOTHING = 0.15

// Lower than SMOOTHING — differentiating an already-smoothed signal
// (heading, to get turn rate) still amplifies its remaining noise a lot,
// so the rate itself needs heavier damping on top to be readable rather
// than jumping around every sample.
const TURN_RATE_SMOOTHING = 0.05

// Standard gravity, m/s² — the expected accelerationIncludingGravity
// magnitude when the device is experiencing gravity alone, used as a
// reference point for how much a given sample is being thrown off by
// real linear acceleration rather than pure tilt.
const GRAVITY_MAGNITUDE = 9.80665

export interface Orientation {
  pitchDeg: number
  rollDeg: number
  rawX: number
  rawY: number
  rawZ: number
}

type PermissionState = 'idle' | 'requesting' | 'granted' | 'denied' | 'unsupported'

// iOS requires an explicit, user-gesture-triggered permission request before
// motion events fire at all; Android and desktop don't have (or need) this
// concept, so requestPermission just moves straight to granted.
function needsExplicitPermission(): boolean {
  const DME = window.DeviceMotionEvent as unknown as {
    requestPermission?: () => Promise<'granted' | 'denied'>
  }
  return typeof DME?.requestPermission === 'function'
}

export function useDeviceOrientation(active = true) {
  const [permission, setPermission] = useState<PermissionState>('idle')
  const [orientation, setOrientation] = useState<Orientation | null>(null)
  // Compass heading — degrees, 0 = north. Comes from a separate event
  // (deviceorientation) than pitch/roll (devicemotion) above, and stays
  // null whenever this device/browser doesn't expose a usable one, rather
  // than guessing: Safari's non-standard webkitCompassHeading is already
  // magnetic-north-referenced and used directly when present (the common
  // case on iOS, the platform the rest of this hook's permission flow is
  // built around); the standards-track alpha field is only trustworthy
  // once the browser reports absolute:true (typically Android Chrome with
  // a working magnetometer) — plain relative alpha (arbitrary zero point)
  // is deliberately not used as a substitute, since a heading that's
  // silently wrong by an unknown offset is worse than no heading at all.
  const [heading, setHeading] = useState<number | null>(null)
  // Rate of turn, degrees/second, positive = turning right — derived by
  // differentiating heading over time rather than from the gyroscope
  // directly. This sidesteps needing to know which gyroscope axis is
  // "yaw" for however the device happens to be mounted (the same
  // ambiguity the invert/swap calibration below exists to handle for
  // pitch/roll): compass heading is already earth-referenced regardless
  // of mount orientation, so its rate of change is turn rate no matter
  // how the phone is sitting.
  const [turnRateDegPerSec, setTurnRateDegPerSec] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!('DeviceMotionEvent' in window)) {
      setPermission('unsupported')
    }
  }, [])

  async function requestPermission() {
    if (!('DeviceMotionEvent' in window)) {
      setPermission('unsupported')
      return
    }
    if (!needsExplicitPermission()) {
      setPermission('granted')
      return
    }
    setPermission('requesting')
    try {
      const DME = window.DeviceMotionEvent as unknown as {
        requestPermission: () => Promise<'granted' | 'denied'>
      }
      const result = await DME.requestPermission()
      if (result === 'granted') {
        setPermission('granted')
      } else {
        setPermission('denied')
        setError(
          'Motion & orientation access denied — allow it in Settings → Safari → Motion & Orientation Access, then reload.'
        )
      }
    } catch {
      setPermission('denied')
      setError('Could not request motion sensor permission.')
    }
  }

  const smoothPitchRollRef = useRef<{ pitch: number; roll: number } | null>(null)

  useEffect(() => {
    if (permission !== 'granted' || !active) return
    smoothPitchRollRef.current = null

    // Deliberately NOT using deviceorientation's beta/gamma (Euler angles) —
    // those hit a real gimbal-lock singularity right around a 90° device
    // tilt, which is exactly where a near-vertical yoke/kneeboard mount
    // sits: pitch inverted past ~13° of additional tilt and bank read out
    // roughly doubled, both classic symptoms of approaching that
    // singularity. Computing tilt directly from the raw gravity vector
    // (the standard aerospace/IMU pitch-roll formula) avoids it for this
    // orientation range entirely, since it doesn't decompose through an
    // intermediate Euler-angle representation at all.
    function handleMotion(e: DeviceMotionEvent) {
      const g = e.accelerationIncludingGravity
      if (!g || g.x === null || g.y === null || g.z === null) return
      const { x, y, z } = g

      // accelerationIncludingGravity is gravity PLUS whatever linear
      // acceleration the device is actually undergoing right now — the
      // pitch/roll formula below assumes it's reading pure gravity, so any
      // real acceleration (a bump, a throttle change, uncoordinated yaw,
      // or just handling the phone) corrupts the tilt it computes. There's
      // no way to separate the two from this sensor alone (that needs a
      // gyroscope-fused AHRS, well beyond "just tilt"), but a cheap proxy
      // works: gravity alone always has a magnitude of ~9.8 m/s², so how
      // far the *measured* magnitude strays from that is a decent signal
      // for how much to trust this particular sample. Reacting less to
      // low-confidence samples (rather than ignoring them outright) means
      // a genuine sustained change — e.g. a real coordinated turn, whose
      // resultant vector correctly reflects bank angle even though its
      // magnitude rises above 1g under load — still gets tracked, just
      // more gradually, while brief bumps and jitter get damped out
      // instead of visibly kicking the horizon.
      const magnitude = Math.sqrt(x * x + y * y + z * z)
      const deviation = Math.abs(magnitude - GRAVITY_MAGNITUDE) / GRAVITY_MAGNITUDE
      const confidence = Math.max(0.15, 1 - deviation)
      const effectiveSmoothing = SMOOTHING * confidence

      const rawPitchDeg = (Math.atan2(-x, Math.sqrt(y * y + z * z)) * 180) / Math.PI
      const rawRollDeg = (Math.atan2(y, z) * 180) / Math.PI

      const prev = smoothPitchRollRef.current
      const pitchDeg = prev ? prev.pitch + effectiveSmoothing * (rawPitchDeg - prev.pitch) : rawPitchDeg
      const rollDeg = prev ? prev.roll + effectiveSmoothing * (rawRollDeg - prev.roll) : rawRollDeg
      smoothPitchRollRef.current = { pitch: pitchDeg, roll: rollDeg }

      setOrientation({ pitchDeg, rollDeg, rawX: x, rawY: y, rawZ: z })
    }

    window.addEventListener('devicemotion', handleMotion)
    return () => window.removeEventListener('devicemotion', handleMotion)
  }, [permission, active])

  // Smoothed as a unit vector, not as a plain angle — naively averaging
  // e.g. 359° and 1° gives 180° (exactly backwards) instead of 0°, so a
  // linear EMA on the raw degree value would cause a wild swing every
  // time the heading crossed due north. Averaging the (cos, sin) pair and
  // re-deriving the angle from that sidesteps the wraparound entirely.
  const smoothHeadingVecRef = useRef<{ x: number; y: number } | null>(null)
  // Previous smoothed-heading sample, for differentiating into turn rate.
  const lastHeadingSampleRef = useRef<{ heading: number; time: number } | null>(null)
  const smoothTurnRateRef = useRef<number | null>(null)

  useEffect(() => {
    if (permission !== 'granted' || !active) return
    smoothHeadingVecRef.current = null
    lastHeadingSampleRef.current = null
    smoothTurnRateRef.current = null

    function handleOrientation(e: DeviceOrientationEvent) {
      const webkitHeading = (e as DeviceOrientationEvent & { webkitCompassHeading?: number })
        .webkitCompassHeading
      let rawHeading: number | null = null
      if (webkitHeading !== undefined) {
        rawHeading = webkitHeading
      } else if (e.absolute && e.alpha !== null) {
        rawHeading = (360 - e.alpha) % 360
      }
      if (rawHeading === null) return

      const rad = (rawHeading * Math.PI) / 180
      const vec = { x: Math.cos(rad), y: Math.sin(rad) }
      const prev = smoothHeadingVecRef.current
      const smoothed = prev
        ? { x: prev.x + SMOOTHING * (vec.x - prev.x), y: prev.y + SMOOTHING * (vec.y - prev.y) }
        : vec
      smoothHeadingVecRef.current = smoothed
      const smoothedHeading = (((Math.atan2(smoothed.y, smoothed.x) * 180) / Math.PI) + 360) % 360
      setHeading(smoothedHeading)

      // Differentiate into turn rate. Skipped on very short intervals
      // (back-to-back events) — dividing by a tiny dt amplifies whatever
      // noise is left after the heading's own smoothing into huge,
      // meaningless rate spikes, so this only updates at a sane minimum
      // interval and just holds the last rate in between. 0.15s (rather
      // than a tighter interval) specifically because even a fraction of a
      // degree of residual compass noise, divided by a very small dt,
      // dominates the resulting rate — widening the interval shrinks that
      // amplification a lot, on top of the EMA pass below.
      const now = performance.now()
      const prevSample = lastHeadingSampleRef.current
      if (prevSample) {
        const dtSec = (now - prevSample.time) / 1000
        if (dtSec > 0.15) {
          const delta = ((smoothedHeading - prevSample.heading + 540) % 360) - 180
          const instantRateDegPerSec = delta / dtSec
          const prevRate = smoothTurnRateRef.current ?? instantRateDegPerSec
          // Differentiation amplifies noise, so this gets its own (heavier)
          // smoothing pass on top of the already-smoothed heading it's
          // computed from.
          const rate = prevRate + TURN_RATE_SMOOTHING * (instantRateDegPerSec - prevRate)
          smoothTurnRateRef.current = rate
          setTurnRateDegPerSec(rate)
          lastHeadingSampleRef.current = { heading: smoothedHeading, time: now }
        }
      } else {
        lastHeadingSampleRef.current = { heading: smoothedHeading, time: now }
      }
    }

    // Chrome on Android fires a SEPARATE 'deviceorientationabsolute' event
    // for magnetometer-referenced heading — its plain 'deviceorientation'
    // event can report absolute:false even when the device has a working
    // compass, so listening to 'deviceorientation' alone silently starves
    // this of any usable heading on those devices (heading stays null
    // forever, and the bearing line above never renders — no error, it
    // just looks like it's ignoring the selected target). Listening to
    // both is harmless: each event is independently checked for a usable
    // absolute heading before being used, so there's no double-counting.
    window.addEventListener('deviceorientation', handleOrientation)
    window.addEventListener(
      'deviceorientationabsolute',
      handleOrientation as unknown as EventListener
    )
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation)
      window.removeEventListener(
        'deviceorientationabsolute',
        handleOrientation as unknown as EventListener
      )
    }
  }, [permission, active])

  return { permission, orientation, heading, turnRateDegPerSec, error, requestPermission }
}
