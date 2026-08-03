import { destinationPoint, distanceNm, type LatLon } from './geo'

const M_PER_NM = 1852
const mToNm = (m: number) => m / M_PER_NM

export interface PatternLeg {
  name: string
  points: LatLon[]
}

export interface TrafficPatternResult {
  legs: PatternLeg[]
  landingThreshold: LatLon
  departureThreshold: LatLon
  trueRunwayHeadingDeg: number
}

/**
 * Builds a rounded-corner turn (a fillet arc) at a 90-degree pattern
 * corner, given the heading flown into it and the heading flown out.
 * Verified before shipping: computed the arc center from the incoming
 * leg's perpendicular, then confirmed numerically that both the arc-start
 * and arc-end points land exactly radiusNm from that center (to within
 * spherical-math rounding), and that the direction you sweep the bearing
 * through matches the turn direction (left turns sweep the bearing down,
 * right turns sweep it up).
 */
function filletTurn(
  corner: LatLon,
  headingInDeg: number,
  headingOutDeg: number,
  radiusNm: number,
  trafficSide: 'left' | 'right',
  steps: number = 8
): { arcStart: LatLon; arcEnd: LatLon; points: LatLon[] } {
  const turnSign = trafficSide === 'left' ? -1 : 1
  const arcStart = destinationPoint(corner, (headingInDeg + 180) % 360, radiusNm)
  const arcEnd = destinationPoint(corner, headingOutDeg, radiusNm)
  const center = destinationPoint(arcStart, (headingInDeg + 90 * turnSign + 360) % 360, radiusNm)

  // Bearing from center to arcStart — sweeping by turnSign*90deg from here
  // lands exactly on arcEnd (this is what was verified numerically).
  const startBearing = (headingInDeg + 90 * turnSign + 180 + 360) % 360

  const points: LatLon[] = []
  for (let i = 0; i <= steps; i++) {
    const bearing = (startBearing + (turnSign * 90 * i) / steps + 360) % 360
    points.push(destinationPoint(center, bearing, radiusNm))
  }

  return { arcStart, arcEnd, points }
}

/**
 * Computes a standard rectangular traffic pattern for a landing on one end
 * of a runway, with rounded (not sharp-cornered) turns.
 *
 * Geometry (verified before shipping): for the classic "45-degree point" —
 * where you turn base when the landing threshold appears 45deg behind the
 * wing — the along-track distance from the threshold to that point,
 * measured on the extended centerline, is exactly equal to the downwind
 * offset. That's not a coincidence, it falls out of the right-triangle
 * geometry directly, which is why the base leg also comes out equal in
 * length to the downwind offset.
 *
 * Two things this simplifies, stated plainly rather than silently assumed:
 *  - Runway heading is treated as magnetic + an approximate variation you
 *    supply (variation isn't looked up live) — fine for a visual training
 *    reference, not for precision navigation.
 *  - Only the downwind offset and the 45-degree base-turn point are
 *    geometrically exact per your spec; the crosswind/final leg lengths,
 *    and the turn radius, are illustrative choices to make a clean visual,
 *    not published procedure.
 */
export function computeTrafficPattern(
  runwayMidpoint: LatLon,
  runwayLengthM: number,
  magneticRunwayHeadingDeg: number, // e.g. 60 for runway "06"
  magneticVariationDeg: number, // approximate, degrees East positive
  downwindOffsetM: number,
  trafficSide: 'left' | 'right'
): TrafficPatternResult {
  const trueHeading = (magneticRunwayHeadingDeg + magneticVariationDeg + 360) % 360
  const reciprocal = (trueHeading + 180) % 360
  // Left traffic: runway is on the pilot's left while on downwind, which
  // works out to offsetting the downwind track toward (trueHeading - 90).
  const offsetBearing =
    trafficSide === 'left' ? (trueHeading - 90 + 360) % 360 : (trueHeading + 90) % 360

  const halfLengthNm = mToNm(runwayLengthM / 2)
  const landingThreshold = destinationPoint(runwayMidpoint, reciprocal, halfLengthNm)
  const departureThreshold = destinationPoint(runwayMidpoint, trueHeading, halfLengthNm)

  const downwindOffsetNm = mToNm(downwindOffsetM)
  const abeamDeparture = destinationPoint(departureThreshold, offsetBearing, downwindOffsetNm)

  // The 45-degree point: along-track distance beyond the landing threshold
  // equals the downwind offset (see the note above).
  const centerlineAtBaseTurn = destinationPoint(landingThreshold, reciprocal, downwindOffsetNm)
  const the45DegreePoint = destinationPoint(centerlineAtBaseTurn, offsetBearing, downwindOffsetNm)

  // Turn radius scales with the downwind offset so it looks proportional
  // at any distance, capped to keep it sensible on very tight or very wide
  // patterns.
  const filletRadiusM = Math.min(300, Math.max(60, downwindOffsetM * 0.2))
  const filletRadiusNm = mToNm(filletRadiusM)

  const finalHeading = trueHeading // centerlineAtBaseTurn -> landingThreshold

  const turn1 = filletTurn(abeamDeparture, offsetBearing, reciprocal, filletRadiusNm, trafficSide)
  const turn2 = filletTurn(the45DegreePoint, reciprocal, (offsetBearing + 180) % 360, filletRadiusNm, trafficSide)
  const turn3 = filletTurn(centerlineAtBaseTurn, (offsetBearing + 180) % 360, finalHeading, filletRadiusNm, trafficSide)

  const legs: PatternLeg[] = [
    { name: 'Runway', points: [departureThreshold, landingThreshold] },
    { name: 'Crosswind', points: [departureThreshold, turn1.points[0]] },
    { name: 'Downwind', points: [...turn1.points, turn2.points[0]] },
    { name: 'Base', points: [...turn2.points, turn3.points[0]] },
    { name: 'Final', points: [...turn3.points, landingThreshold] }
  ]

  return { legs, landingThreshold, departureThreshold, trueRunwayHeadingDeg: trueHeading }
}

/** Parses a runway string like "06/24" into its two magnetic headings (degrees). */
export function parseRunwayEnds(runway: string): { endA: number; endB: number } | null {
  const match = runway.match(/^(\d{1,2})\/(\d{1,2})$/)
  if (!match) return null
  return { endA: Number(match[1]) * 10, endB: Number(match[2]) * 10 }
}

// re-export so downstream call sites that only import from this module
// still get access to distance math if they need it for pattern-related UI
export { distanceNm }
