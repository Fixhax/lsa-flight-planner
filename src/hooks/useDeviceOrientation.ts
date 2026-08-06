import { useEffect, useState } from 'react'

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

  useEffect(() => {
    if (permission !== 'granted' || !active) return

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
      const pitchDeg = (Math.atan2(-x, Math.sqrt(y * y + z * z)) * 180) / Math.PI
      const rollDeg = (Math.atan2(y, z) * 180) / Math.PI
      setOrientation({ pitchDeg, rollDeg, rawX: x, rawY: y, rawZ: z })
    }

    window.addEventListener('devicemotion', handleMotion)
    return () => window.removeEventListener('devicemotion', handleMotion)
  }, [permission, active])

  useEffect(() => {
    if (permission !== 'granted' || !active) return

    function handleOrientation(e: DeviceOrientationEvent) {
      const webkitHeading = (e as DeviceOrientationEvent & { webkitCompassHeading?: number })
        .webkitCompassHeading
      if (webkitHeading !== undefined) {
        setHeading(webkitHeading)
      } else if (e.absolute && e.alpha !== null) {
        setHeading((360 - e.alpha) % 360)
      }
    }

    window.addEventListener('deviceorientation', handleOrientation)
    return () => window.removeEventListener('deviceorientation', handleOrientation)
  }, [permission, active])

  return { permission, orientation, heading, error, requestPermission }
}
