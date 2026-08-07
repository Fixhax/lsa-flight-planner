import { useEffect, useRef, useState } from 'react'

// Exponential-moving-average smoothing factor for the compass heading —
// lower is smoother but laggier, higher is snappier but jitterier. Raw
// magnetometer readings are noisy enough on real devices that passing them
// straight through made the bearing needle visibly shaky.
const SMOOTHING = 0.15

type PermissionState = 'idle' | 'requesting' | 'granted' | 'denied' | 'unsupported'

// Whether any orientation event has fired, whether any of them carried a
// usable absolute heading, and whether that heading is actually real —
// lets the UI tell apart three different broken states: no orientation
// sensor at all, a sensor present but not giving a magnetometer-referenced
// heading (usually an uncalibrated compass — fixed by a figure-8 motion),
// and — the one that isn't fixable client-side — a device that reports
// absolute:true with a value that never moves no matter how you turn it.
// That last one shows up on some Android/Chrome tablets with no real
// magnetometer chip: instead of omitting heading, the platform hands back
// a frozen placeholder (typically exactly 0°), sometimes for a single
// event that never repeats at all — so it needs to be caught by checking
// back after a delay, not by anything on the event itself.
export interface HeadingDiagnostics {
  sawEvent: boolean
  sawAbsolute: boolean
  stuck: boolean
}

// How long to wait after the first usable heading sample before checking
// whether it's actually moved. Long enough that a genuinely working
// compass held still for a moment has time to show its normal sensor
// noise; short enough not to leave the UI showing a wrong heading for too
// long on a device that doesn't have one.
const STUCK_CHECK_DELAY_MS = 3000
const STUCK_EPSILON_DEG = 0.03

// iOS requires an explicit, user-gesture-triggered permission request before
// orientation events fire at all (this same prompt also covers motion
// events, even though this hook no longer uses those) — Android and desktop
// don't have or need this concept, so requestPermission just moves straight
// to granted.
function needsExplicitPermission(): boolean {
  const DME = window.DeviceMotionEvent as unknown as {
    requestPermission?: () => Promise<'granted' | 'denied'>
  }
  return typeof DME?.requestPermission === 'function'
}

export function useDeviceOrientation(active = true) {
  const [permission, setPermission] = useState<PermissionState>('idle')
  // Compass heading — degrees, 0 = north. Stays null whenever this
  // device/browser doesn't expose a usable one, rather than guessing:
  // Safari's non-standard webkitCompassHeading is already magnetic-north-
  // referenced and used directly when present (the common case on iOS);
  // the standards-track alpha field is only trustworthy once the browser
  // reports absolute:true (typically Android Chrome with a working
  // magnetometer) — plain relative alpha (arbitrary zero point) is
  // deliberately not used as a substitute, since a heading that's silently
  // wrong by an unknown offset is worse than no heading at all.
  const [heading, setHeading] = useState<number | null>(null)
  const [diagnostics, setDiagnostics] = useState<HeadingDiagnostics>({
    sawEvent: false,
    sawAbsolute: false,
    stuck: false
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!('DeviceMotionEvent' in window) && !('DeviceOrientationEvent' in window)) {
      setPermission('unsupported')
    }
  }, [])

  async function requestPermission() {
    if (!('DeviceMotionEvent' in window) && !('DeviceOrientationEvent' in window)) {
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

  // Smoothed as a unit vector, not as a plain angle — naively averaging
  // e.g. 359° and 1° gives 180° (exactly backwards) instead of 0°, so a
  // linear EMA on the raw degree value would cause a wild swing every
  // time the heading crossed due north. Averaging the (cos, sin) pair and
  // re-deriving the angle from that sidesteps the wraparound entirely.
  const smoothHeadingVecRef = useRef<{ x: number; y: number } | null>(null)
  // Anchor value/time for the current "is this actually moving" check, and
  // the latest raw sample seen — compared against each other when the
  // scheduled check fires, however many (or few — down to just one) events
  // arrived in between.
  const anchorRef = useRef<{ value: number; time: number } | null>(null)
  const lastRawRef = useRef<number | null>(null)
  const stuckRef = useRef(false)
  const stuckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (permission !== 'granted' || !active) return
    smoothHeadingVecRef.current = null
    anchorRef.current = null
    lastRawRef.current = null
    stuckRef.current = false
    if (stuckTimerRef.current !== null) {
      clearTimeout(stuckTimerRef.current)
      stuckTimerRef.current = null
    }
    setDiagnostics({ sawEvent: false, sawAbsolute: false, stuck: false })

    function scheduleStuckCheck() {
      if (stuckTimerRef.current !== null) clearTimeout(stuckTimerRef.current)
      stuckTimerRef.current = setTimeout(() => {
        stuckTimerRef.current = null
        const anchor = anchorRef.current
        const last = lastRawRef.current
        if (anchor === null || last === null) return
        const delta = Math.abs(((last - anchor.value + 540) % 360) - 180)
        if (delta <= STUCK_EPSILON_DEG) {
          stuckRef.current = true
          smoothHeadingVecRef.current = null
          setHeading(null)
          setDiagnostics((prev) => ({ ...prev, stuck: true }))
        }
      }, STUCK_CHECK_DELAY_MS)
    }

    function handleOrientation(e: DeviceOrientationEvent) {
      const webkitHeading = (e as DeviceOrientationEvent & { webkitCompassHeading?: number })
        .webkitCompassHeading
      let rawHeading: number | null = null
      if (webkitHeading !== undefined) {
        rawHeading = webkitHeading
      } else if (e.absolute && e.alpha !== null) {
        rawHeading = (360 - e.alpha) % 360
      }

      setDiagnostics((prev) => ({
        ...prev,
        sawEvent: true,
        sawAbsolute: prev.sawAbsolute || rawHeading !== null
      }))
      if (rawHeading === null) return

      lastRawRef.current = rawHeading

      if (anchorRef.current === null) {
        // First usable sample of this run — start the clock on checking
        // whether it actually moves. Covers everything from a device that
        // fires exactly one synthetic event and then goes silent forever,
        // to one that keeps firing steadily but always with the same
        // frozen value — the check below doesn't care which.
        anchorRef.current = { value: rawHeading, time: performance.now() }
        scheduleStuckCheck()
      } else if (stuckRef.current) {
        // Already flagged stuck this session, but a real change just came
        // in — trust it again rather than staying stuck forever, and
        // restart the check against this new anchor.
        const delta = Math.abs(((rawHeading - anchorRef.current.value + 540) % 360) - 180)
        if (delta > STUCK_EPSILON_DEG) {
          stuckRef.current = false
          anchorRef.current = { value: rawHeading, time: performance.now() }
          smoothHeadingVecRef.current = null
          setDiagnostics((prev) => ({ ...prev, stuck: false }))
          scheduleStuckCheck()
        }
      }

      if (stuckRef.current) return

      const rad = (rawHeading * Math.PI) / 180
      const vec = { x: Math.cos(rad), y: Math.sin(rad) }
      const prev = smoothHeadingVecRef.current
      const smoothed = prev
        ? { x: prev.x + SMOOTHING * (vec.x - prev.x), y: prev.y + SMOOTHING * (vec.y - prev.y) }
        : vec
      smoothHeadingVecRef.current = smoothed
      const smoothedHeading = (((Math.atan2(smoothed.y, smoothed.x) * 180) / Math.PI) + 360) % 360
      setHeading(smoothedHeading)
    }

    // Chrome on Android fires a SEPARATE 'deviceorientationabsolute' event
    // for magnetometer-referenced heading — its plain 'deviceorientation'
    // event can report absolute:false even when the device has a working
    // compass, so listening to 'deviceorientation' alone silently starves
    // this of any usable heading on those devices. Listening to both is
    // harmless: each event is independently checked for a usable absolute
    // heading before being used, so there's no double-counting.
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
      if (stuckTimerRef.current !== null) clearTimeout(stuckTimerRef.current)
    }
  }, [permission, active])

  return { permission, heading, diagnostics, error, requestPermission }
}
