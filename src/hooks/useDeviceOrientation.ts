import { useEffect, useRef, useState } from 'react'

// Exponential-moving-average smoothing factor for raw sensor readings —
// lower is smoother but laggier, higher is snappier but jitterier. Raw
// accelerometer/magnetometer readings on real phones are noisy enough
// (device motion events fire tens of times a second, each with a few
// degrees of scatter) that passing them straight through made the gauge
// visibly shaky rather than tracking smooth, real attitude changes.
const SMOOTHING = 0.15

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
      const rawPitchDeg = (Math.atan2(-x, Math.sqrt(y * y + z * z)) * 180) / Math.PI
      const rawRollDeg = (Math.atan2(y, z) * 180) / Math.PI

      const prev = smoothPitchRollRef.current
      const pitchDeg = prev ? prev.pitch + SMOOTHING * (rawPitchDeg - prev.pitch) : rawPitchDeg
      const rollDeg = prev ? prev.roll + SMOOTHING * (rawRollDeg - prev.roll) : rawRollDeg
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

  useEffect(() => {
    if (permission !== 'granted' || !active) return
    smoothHeadingVecRef.current = null

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
      setHeading((((Math.atan2(smoothed.y, smoothed.x) * 180) / Math.PI) + 360) % 360)
    }

    window.addEventListener('deviceorientation', handleOrientation)
    return () => window.removeEventListener('deviceorientation', handleOrientation)
  }, [permission, active])

  return { permission, orientation, heading, error, requestPermission }
}
