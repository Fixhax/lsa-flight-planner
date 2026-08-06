import type { AircraftProfile } from '../types/aircraft'
import { distanceNm, trueCourse, type LatLon } from './geo'
import { solveWindTriangle, type Wind } from './wind'

export const MIN_RESERVE_MINUTES = 6

export interface Waypoint extends LatLon {
  id: string
  name: string
  elevationFt?: number // field elevation, when known (e.g. from a picked strip)
  runway?: string // runway ident, e.g. '16/34', when known
  pprContact?: { name: string; phone: string } // PPR contact, when the strip requires one
  country?: 'NO' | 'SE' // only known for waypoints picked from the strip dropdown
  icao?: string // ICAO aerodrome code, when known
  customsCleared?: boolean // designated customs aerodrome, when known
  frequencies?: { type: string; mhz: number; note?: string }[] // confirmed radio frequencies, when known
}

export interface Leg {
  from: Waypoint
  to: Waypoint
  distanceNm: number
  trueCourseDeg: number
  trueHeadingDeg: number
  windCorrectionAngleDeg: number
  groundSpeedKt: number
  timeMinutes: number
  fuelBurnL: number
  fuelRemainingAfterL: number // fuel left once this leg is complete, given fuelOnBoardL
}

export interface NavLog {
  legs: Leg[]
  totalDistanceNm: number
  totalTimeMinutes: number
  totalFuelBurnL: number
  reserveMinutes: number // effective reserve after applying the 6-minute floor
  reserveFuelL: number
  usableFuelL: number // max the tanks can hold, minus unusable fuel
  fuelOnBoardL: number // what you told it you're departing with (clamped to usableFuelL)
  fuelRequiredL: number // trip fuel + reserve — the minimum you'd need to depart with
  fuelRemainingAtLandingL: number // fuelOnBoardL - totalFuelBurnL; can go negative
  marginAboveReserveL: number // fuelRemainingAtLandingL - reserveFuelL; negative = eating into reserve
}

/** Builds a full nav log from an ordered list of waypoints. */
export function planRoute(
  waypoints: Waypoint[],
  aircraft: AircraftProfile,
  wind: Wind,
  cruiseTasKt: number = aircraft.cruiseTasKt,
  usableFuelL: number = aircraft.fuelCapacityL - aircraft.unusableFuelL,
  fuelOnBoardLInput: number = usableFuelL,
  reserveMinutesInput: number = aircraft.reserveMinutes,
  fuelBurnLph: number = aircraft.fuelBurnLph
): NavLog {
  const fuelOnBoardL = Math.max(0, Math.min(fuelOnBoardLInput, usableFuelL))
  const reserveMinutes = Math.max(MIN_RESERVE_MINUTES, reserveMinutesInput)
  const legs: Leg[] = []
  let remaining = fuelOnBoardL

  for (let i = 0; i < waypoints.length - 1; i++) {
    const from = waypoints[i]
    const to = waypoints[i + 1]

    const dist = distanceNm(from, to)
    const tc = trueCourse(from, to)
    const { windCorrectionAngleDeg, trueHeadingDeg, groundSpeedKt } =
      solveWindTriangle(tc, cruiseTasKt, wind)

    const timeMinutes = groundSpeedKt > 0 ? (dist / groundSpeedKt) * 60 : 0
    const fuelBurnL = (timeMinutes / 60) * fuelBurnLph
    remaining -= fuelBurnL

    legs.push({
      from,
      to,
      distanceNm: dist,
      trueCourseDeg: tc,
      trueHeadingDeg,
      windCorrectionAngleDeg,
      groundSpeedKt,
      timeMinutes,
      fuelBurnL,
      fuelRemainingAfterL: remaining
    })
  }

  const totalDistanceNm = legs.reduce((sum, l) => sum + l.distanceNm, 0)
  const totalTimeMinutes = legs.reduce((sum, l) => sum + l.timeMinutes, 0)
  const totalFuelBurnL = legs.reduce((sum, l) => sum + l.fuelBurnL, 0)

  const reserveFuelL = (reserveMinutes / 60) * fuelBurnLph
  const fuelRequiredL = totalFuelBurnL + reserveFuelL
  const fuelRemainingAtLandingL = fuelOnBoardL - totalFuelBurnL
  const marginAboveReserveL = fuelRemainingAtLandingL - reserveFuelL

  return {
    legs,
    totalDistanceNm,
    totalTimeMinutes,
    totalFuelBurnL,
    reserveMinutes,
    reserveFuelL,
    usableFuelL,
    fuelOnBoardL,
    fuelRequiredL,
    fuelRemainingAtLandingL,
    marginAboveReserveL
  }
}

export function formatMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
  const m = Math.round(totalMinutes % 60)
  return `${h}h ${m.toString().padStart(2, '0')}m`
}
