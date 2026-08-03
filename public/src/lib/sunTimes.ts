// Fetches real sunset/twilight times from sunrisesunset.io — a free,
// no-API-key service. Times come back already localized to the queried
// coordinates (DST included), so no local timezone math is needed here.

export interface SunEventsResult {
  sunset: string // "HH:MM:SS", local to the queried location
  civilDuskEnd: string // "HH:MM:SS", local to the queried location — sun 6deg below horizon
  timezone: string // IANA zone, e.g. "Europe/Oslo"
  date: string
}

export type SunEventsOutcome =
  | { kind: 'ok'; result: SunEventsResult }
  | { kind: 'unavailable' } // polar day/night or otherwise no normal sunset today

export async function fetchSunEvents(lat: number, lon: number): Promise<SunEventsOutcome> {
  const url = `https://api.sunrisesunset.io/json?lat=${lat}&lng=${lon}&time_format=24`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Sun times service returned ${res.status}`)
  }
  const data = await res.json()
  if (data?.status !== 'OK' || !data?.results) {
    throw new Error('Unexpected response from sun times service')
  }
  const r = data.results
  if (!r.sunset || !r.dusk) {
    return { kind: 'unavailable' }
  }
  return {
    kind: 'ok',
    result: {
      sunset: r.sunset,
      civilDuskEnd: r.dusk,
      timezone: r.timezone,
      date: r.date
    }
  }
}

/** Trims a "HH:MM:SS" string down to "HH:MM" for display. */
export function trimSeconds(hms: string): string {
  const parts = hms.split(':')
  return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : hms
}
