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

    // beta/gamma are defined relative to the device's own physical frame.
    // An earlier version tried to auto-compensate for the current screen
    // orientation angle so this would read correctly held any which way —
    // but that angle isn't reliably defined for a device sitting relatively
    // flat in a mount, and if it read differently at calibration time than
    // a moment later, the meaning of "pitch" would shift out from under the
    // calibration, making Level/Center appear to not work. Simpler and more
    // predictable: always beta = pitch, gamma = roll, and let Level/Center
    // plus the invert toggles account for whatever the actual mount is.
    function handleOrientation(e: DeviceOrientationEvent) {
      if (e.beta === null || e.gamma === null) return
      setOrientation({ pitchDeg: e.beta, rollDeg: e.gamma })
    }

    window.addEventListener('deviceorientation', handleOrientation)
    return () => window.removeEventListener('deviceorientation', handleOrientation)
  }, [permission])

  return { permission, orientation, error, requestPermission }
}
