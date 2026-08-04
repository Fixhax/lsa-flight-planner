import { useEffect, useState } from 'react'

export interface Orientation {
  pitchDeg: number
  rollDeg: number
}

type PermissionState = 'idle' | 'requesting' | 'granted' | 'denied' | 'unsupported'

// iOS requires an explicit, user-gesture-triggered permission request before
// motion/orientation events fire at all; Android and desktop don't have (or
// need) this concept, so requestPermission just moves straight to granted.
function needsExplicitPermission(): boolean {
  const DOE = window.DeviceOrientationEvent as unknown as {
    requestPermission?: () => Promise<'granted' | 'denied'>
  }
  return typeof DOE?.requestPermission === 'function'
}

export function useDeviceOrientation() {
  const [permission, setPermission] = useState<PermissionState>('idle')
  const [orientation, setOrientation] = useState<Orientation | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!('DeviceOrientationEvent' in window)) {
      setPermission('unsupported')
    }
  }, [])

  async function requestPermission() {
    if (!('DeviceOrientationEvent' in window)) {
      setPermission('unsupported')
      return
    }
    if (!needsExplicitPermission()) {
      setPermission('granted')
      return
    }
    setPermission('requesting')
    try {
      const DOE = window.DeviceOrientationEvent as unknown as {
        requestPermission: () => Promise<'granted' | 'denied'>
      }
      const result = await DOE.requestPermission()
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
    if (permission !== 'granted') return

    // beta/gamma are defined relative to the device's own physical frame,
    // not the screen's current rotation — a phone in a landscape mount
    // reports very different raw numbers than the same tilt in portrait.
    // Compensating by the current screen angle keeps pitch/roll meaning
    // consistent regardless of how the device is actually mounted.
    function handleOrientation(e: DeviceOrientationEvent) {
      if (e.beta === null || e.gamma === null) return
      const angle = window.screen.orientation?.angle ?? 0
      let pitchDeg: number
      let rollDeg: number
      if (angle === 90) {
        pitchDeg = -e.gamma
        rollDeg = e.beta
      } else if (angle === 270 || angle === -90) {
        pitchDeg = e.gamma
        rollDeg = -e.beta
      } else if (angle === 180) {
        pitchDeg = -e.beta
        rollDeg = -e.gamma
      } else {
        pitchDeg = e.beta
        rollDeg = e.gamma
      }
      setOrientation({ pitchDeg, rollDeg })
    }

    window.addEventListener('deviceorientation', handleOrientation)
    return () => window.removeEventListener('deviceorientation', handleOrientation)
  }, [permission])

  return { permission, orientation, error, requestPermission }
}
