import type { Waypoint, NavLog } from './planning'
import type { AircraftProfile } from '../types/aircraft'

// Field rules follow ICAO flight plan guidance (SKYbrary / EUROCONTROL,
// "Flight Plan Completion", 2012 format). Key rules this implementation
// follows deliberately, since they're easy to get wrong:
//  - Item 13 departure time is UTC, not local — a genuinely common error
//  - Item 10 equipment "S" means FULL standard suite (VHF/VOR/ILS) — using
//    it without actually having ILS is called out in the source as a
//    serious, common mistake, so this tool never defaults to it
//  - Item 19 P/ is zero-padded to 3 digits, E/ and EET are HHMM

export interface FlightPlanInputs {
  aircraftReg: string
  aircraftTypeIcao: string // ICAO Doc 8643 type designator, or blank/ZZZZ if unlisted
  wakeCategory: 'L' | 'M' | 'H'
  equipment: string // COM/NAV equipment code(s) — see footnote on the "S" trap
  transponder: string // surveillance (SSR) equipment code
  etdUtc: string // "HH:MM", UTC — ICAO flight plans are always UTC, never local
  altAerodrome: string
  pob: number
  pilotName: string
  aircraftColour: string
  eltCarried: boolean
  survivalEquipmentNote: string
  customsNotified: boolean // pilot's own tracking checkbox — not an actual submission
}

export interface BorderCrossingStatus {
  crossesBorder: boolean
  departureCountry?: 'NO' | 'SE'
  destinationCountry?: 'NO' | 'SE'
  countryUnknown: boolean
}

const COUNTRY_NAME: Record<'NO' | 'SE', string> = { NO: 'Norway', SE: 'Sweden' }

export function detectBorderCrossing(waypoints: Waypoint[]): BorderCrossingStatus {
  const valid = waypoints.filter(
    (w) => Number.isFinite(w.lat) && Number.isFinite(w.lon) && (w.lat !== 0 || w.lon !== 0)
  )
  const departure = valid[0]
  const destination = valid[valid.length - 1]

  if (!departure || !destination || valid.length < 2 || !departure.country || !destination.country) {
    return { crossesBorder: false, countryUnknown: true }
  }

  return {
    crossesBorder: departure.country !== destination.country,
    departureCountry: departure.country,
    destinationCountry: destination.country,
    countryUnknown: false
  }
}

function fmtHM(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
  const m = Math.round(totalMinutes % 60)
  return `${h}h ${m.toString().padStart(2, '0')}m`
}

function icaoTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24
  const m = Math.round(totalMinutes % 60)
  return `${h.toString().padStart(2, '0')}${m.toString().padStart(2, '0')}`
}

function icaoSpeed(speedKt: number): string {
  return `N${Math.round(speedKt).toString().padStart(4, '0')}`
}

function icaoLevel(altitudeFt: number): string {
  return `A${Math.round(altitudeFt / 100).toString().padStart(3, '0')}`
}

function icaoDof(date: Date): string {
  const yy = (date.getFullYear() % 100).toString().padStart(2, '0')
  const mm = (date.getMonth() + 1).toString().padStart(2, '0')
  const dd = date.getDate().toString().padStart(2, '0')
  return `${yy}${mm}${dd}`
}

function waypointLabel(w: Waypoint): string {
  if (w.icao) return `${w.name || ''} (${w.icao})`.trim()
  if (w.name) return w.name
  return `${w.lat.toFixed(4)}, ${w.lon.toFixed(4)}`
}

/** ICAO route-point encoding for a waypoint with no assigned ident: DDMM(N/S)DDDMM(E/W). */
function waypointIcaoCoord(w: Waypoint): string {
  const latDeg = Math.abs(w.lat)
  const lonDeg = Math.abs(w.lon)
  const latMin = Math.round((latDeg % 1) * 60)
  const lonMin = Math.round((lonDeg % 1) * 60)
  const latStr = `${Math.floor(latDeg).toString().padStart(2, '0')}${latMin.toString().padStart(2, '0')}${w.lat >= 0 ? 'N' : 'S'}`
  const lonStr = `${Math.floor(lonDeg).toString().padStart(3, '0')}${lonMin.toString().padStart(2, '0')}${w.lon >= 0 ? 'E' : 'W'}`
  return `${latStr}${lonStr}`
}

function waypointRouteIdent(w: Waypoint): string {
  return w.icao ?? waypointIcaoCoord(w)
}

/**
 * Builds a flight-plan preparation sheet, laid out by ICAO item number
 * per SKYbrary's "Flight Plan Completion" guidance — meant to be read off
 * and transcribed into ippc.no's actual form (or given over the
 * phone/radio to AFIS), not pasted anywhere as a machine-readable message.
 * This app doesn't submit anything on your behalf.
 */
export function generateFlightPlanText(
  waypoints: Waypoint[],
  aircraft: AircraftProfile,
  navLog: NavLog,
  cruiseAltitudeFt: number,
  inputs: FlightPlanInputs,
  border: BorderCrossingStatus
): string {
  const valid = waypoints.filter(
    (w) => Number.isFinite(w.lat) && Number.isFinite(w.lon) && (w.lat !== 0 || w.lon !== 0)
  )
  const departure = valid[0]
  const destination = valid[valid.length - 1]
  const enroute = valid.slice(1, -1)

  const enduranceMinutes = (navLog.usableFuelL / aircraft.fuelBurnLph) * 60
  const typeUnlisted = !inputs.aircraftTypeIcao

  const lines: string[] = []
  lines.push('=== FLIGHT PLAN PREPARATION SHEET (VFR) ===')
  lines.push('Not submitted anywhere \u2014 file this yourself via ippc.no or by radio/phone to AFIS.')
  lines.push('')
  lines.push(`Item 7  Aircraft identification: ${inputs.aircraftReg || '(fill in registration)'}`)
  lines.push('Item 8  Flight rules / type of flight: V / G  (VFR, general aviation)')
  lines.push(
    `Item 9  Type / wake turbulence category: ${typeUnlisted ? 'ZZZZ' : inputs.aircraftTypeIcao} / ${inputs.wakeCategory}` +
      (typeUnlisted ? '  \u2014 unlisted type: add "TYP/<aircraft type>" in remarks (Item 18)' : '')
  )
  lines.push(
    `Item 10 Equipment (COM/NAV / surveillance): ${inputs.equipment || '(fill in \u2014 see warning below)'} / ${inputs.transponder || '(fill in)'}`
  )
  lines.push(
    `Item 13 Departure aerodrome / EOBT (UTC): ${departure ? waypointLabel(departure) : '(add departure)'} / ${inputs.etdUtc ? inputs.etdUtc.replace(':', '') : '(set ETD in UTC)'}`
  )
  lines.push('Item 15 Cruising speed / level / route:')
  lines.push(
    `        ${icaoSpeed(aircraft.cruiseTasKt)} / ${icaoLevel(cruiseAltitudeFt)} / ${
      enroute.length > 0 ? enroute.map((w) => waypointRouteIdent(w)).join(' DCT ') : 'DCT'
    }`
  )
  lines.push(
    `        (${Math.round(aircraft.cruiseTasKt)} kt / ${cruiseAltitudeFt.toLocaleString()} ft \u2014 route: ${
      enroute.length > 0 ? enroute.map(waypointLabel).join(' \u2192 ') : 'direct'
    })`
  )
  lines.push(
    `Item 16 Destination / total EET / alternate: ${destination ? waypointLabel(destination) : '(add destination)'} / ${icaoTime(navLog.totalTimeMinutes)} (${fmtHM(navLog.totalTimeMinutes)}) / ${inputs.altAerodrome || '(none entered)'}`
  )

  const item18: string[] = [`DOF/${icaoDof(new Date())}`]
  if (typeUnlisted) item18.push(`TYP/${aircraft.displayName.toUpperCase()}`)
  if (border.crossesBorder) {
    item18.push('RMK/BORDER CROSSING NO/SE \u2013 CUSTOMS NOTIFICATION REQUIRED IF DEST NOT A DESIGNATED CUSTOMS AERODROME')
  }
  lines.push(`Item 18 Other information: ${item18.join(' ')}`)

  lines.push(
    `Item 19 Endurance / persons on board: E/${icaoTime(enduranceMinutes)} (${fmtHM(enduranceMinutes)})  P/${inputs.pob.toString().padStart(3, '0')}`
  )
  lines.push(
    `        Radio (R/): ${inputs.eltCarried ? 'E (ELT carried)' : 'none of U/V/E \u2014 no ELT entered'}  \u2014 add U/V if you carry 243.0/121.5 MHz emergency radio capability`
  )
  lines.push(
    `        Survival (S/) / Jackets (J/) / Dinghies (D/): ${inputs.survivalEquipmentNote || '(none entered \u2014 fill in per your actual kit)'}`
  )
  lines.push(`        Aircraft colour (A/): ${inputs.aircraftColour || '(fill in)'}`)
  lines.push(`        Pilot in command (C/): ${inputs.pilotName || '(fill in)'}`)

  if (border.crossesBorder) {
    lines.push('')
    lines.push('--- BORDER CROSSING DETECTED (Norway \u2194 Sweden) ---')
    lines.push(
      `${COUNTRY_NAME[border.departureCountry!]} \u2192 ${COUNTRY_NAME[border.destinationCountry!]}. Customs notification is required: either land at a` +
        ' designated customs aerodrome, or notify customs at least 4 hours before ETA if not.'
    )
    if (destination?.customsCleared) {
      lines.push(
        `\u2713 ${waypointLabel(destination)} is marked in this app's data as a customs-approved aerodrome \u2014 confirm current hours/procedures with the field before relying on it.`
      )
    } else {
      lines.push(
        '\u26a0 This destination is not marked as a customs aerodrome in this app\u2019s data \u2014 check the official AIP for the nearest designated one, or plan on the 4-hour advance notice.'
      )
    }
    lines.push(
      inputs.customsNotified
        ? '\u2713 Marked as notified (your own tracking, not an actual submission).'
        : '\u2717 Not yet marked as notified.'
    )
  }

  const pprLines = [departure, destination]
    .filter((w): w is Waypoint => !!w?.pprContact)
    .map((w) => `${waypointLabel(w)}: PPR required \u2014 call ${w.pprContact!.name}, tel. ${w.pprContact!.phone}`)
  if (pprLines.length > 0) {
    lines.push('')
    lines.push('--- PPR reminders ---')
    pprLines.forEach((l) => lines.push(l))
  }

  if (!inputs.equipment || inputs.equipment.toUpperCase() === 'S') {
    lines.push('')
    lines.push(
      '\u26a0 Equipment code "S" means the FULL standard suite (VHF RTF, VOR, AND ILS). Using it without ' +
        'actually having ILS is a common, flagged mistake \u2014 list your real equipment instead (e.g. V for VHF, G for GNSS).'
    )
  }

  return lines.join('\n')
}
