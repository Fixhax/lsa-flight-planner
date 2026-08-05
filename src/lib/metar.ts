import { distanceNm } from './geo'

export interface MetarTafResult {
  icao: string
  metar: string | null
  taf: string | null
}

export interface NearestStation {
  icao: string
  distanceNm: number
}

interface AwcMetarRecord {
  icaoId?: string
  lat?: number
  lon?: number
}

async function queryStationsInBox(lat: number, lon: number, latPadDeg: number): Promise<AwcMetarRecord[]> {
  // Longitude degrees cover less real distance the further from the
  // equator you are — widened to roughly match latPadDeg's real distance
  // rather than using a fixed-degree square, which would be a much
  // narrower box east-west than north-south this far north.
  const lonPadDeg = latPadDeg / Math.max(0.2, Math.cos((lat * Math.PI) / 180))
  const bbox = `${lat - latPadDeg},${lon - lonPadDeg},${lat + latPadDeg},${lon + lonPadDeg}`
  const res = await fetch(`/api/aviation-weather?kind=metar&bbox=${bbox}&format=json`, {
    signal: AbortSignal.timeout(10000)
  })
  if (!res.ok) throw new Error(`Aviation Weather Center returned ${res.status}`)
  return (await res.json()) as AwcMetarRecord[]
}

// Nearest currently-reporting METAR station to a point — used to fall
// back to when a waypoint has no ICAO identifier of its own (most curated
// grass/gravel strips don't). Widens the search box in steps rather than
// one big query, since most of the time a station is close by and a huge
// box would be wasted work. The result is always labeled with its
// distance in the UI — it's weather AT that station, not necessarily
// representative of conditions at the actual waypoint.
export async function fetchNearestStation(lat: number, lon: number): Promise<NearestStation | null> {
  for (const latPadDeg of [1.5, 3, 6]) {
    const stations = await queryStationsInBox(lat, lon, latPadDeg)
    let best: NearestStation | null = null
    for (const s of stations) {
      if (!s.icaoId || s.lat === undefined || s.lon === undefined) continue
      const d = distanceNm({ lat, lon }, { lat: s.lat, lon: s.lon })
      if (!best || d < best.distanceNm) best = { icao: s.icaoId, distanceNm: d }
    }
    if (best) return best
  }
  return null
}

async function fetchRaw(kind: 'metar' | 'taf', icao: string): Promise<string | null> {
  const res = await fetch(`/api/aviation-weather?kind=${kind}&ids=${encodeURIComponent(icao)}&format=raw`, {
    signal: AbortSignal.timeout(10000)
  })
  if (!res.ok) throw new Error(`Aviation Weather Center returned ${res.status}`)
  const text = (await res.text()).trim()
  if (!text) return null
  return text
}

// Official raw METAR/TAF text from the (US) Aviation Weather Center's free
// public API — genuinely different from the Weather report panel's
// Open-Meteo forecast (a numerical model): this is the actual published
// aviation report, but only exists for airports with an ICAO identifier
// that issues one. Most of this app's curated grass/gravel strips are
// uncontrolled and don't have one. Returned as raw, undecoded text on
// purpose — summarizing/decoding it here risks introducing a misreading
// that wouldn't exist if you read the real thing.
export async function fetchMetarTaf(icao: string): Promise<MetarTafResult> {
  const [metar, taf] = await Promise.all([
    fetchRaw('metar', icao).catch(() => null),
    fetchRaw('taf', icao).catch(() => null)
  ])
  return { icao, metar, taf }
}
