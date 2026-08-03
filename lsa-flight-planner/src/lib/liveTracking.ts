import type { Waypoint } from './planning'
import { distanceNm } from './geo'

export interface LivePosition {
  lat: number
  lon: number
  speedKt?: number // from the GPS, when the device reports it
  headingDeg?: number
  accuracyM?: number
  timestamp: number
}

export interface RemainingEstimate {
  remainingNm: number
  etaMs: number // epoch ms
  usingGpsSpeed: boolean
  groundSpeedKt: number
}

/**
 * Finds the remaining route distance from the live position by checking,
 * for each waypoint, "distance to here + remaining legs from here to the
 * end" and taking the minimum — a simple but effective way to figure out
 * roughly where along a simple point-to-point route you currently are,
 * without needing full route-projection math.
 */
export function estimateRemaining(
  waypoints: Waypoint[],
  position: LivePosition,
  fallbackGroundSpeedKt: number
): RemainingEstimate | null {
  const valid = waypoints.filter(
    (w) => Number.isFinite(w.lat) && Number.isFinite(w.lon) && (w.lat !== 0 || w.lon !== 0)
  )
  if (valid.length < 2) return null

  const legDistances: number[] = []
  for (let i = 0; i < valid.length - 1; i++) {
    legDistances.push(distanceNm(valid[i], valid[i + 1]))
  }

  let best = Infinity
  for (let i = 0; i < valid.length; i++) {
    const toHere = distanceNm(position, valid[i])
    const remainingLegs = legDistances.slice(i).reduce((s, d) => s + d, 0)
    const total = toHere + remainingLegs
    if (total < best) best = total
  }

  const usingGpsSpeed = (position.speedKt ?? 0) > 5 // ignore near-zero/noisy GPS speed
  const groundSpeedKt = usingGpsSpeed ? (position.speedKt as number) : fallbackGroundSpeedKt

  if (groundSpeedKt <= 0) {
    return { remainingNm: best, etaMs: NaN, usingGpsSpeed, groundSpeedKt }
  }

  const remainingHours = best / groundSpeedKt
  const etaMs = Date.now() + remainingHours * 3600000

  return { remainingNm: best, etaMs, usingGpsSpeed, groundSpeedKt }
}
