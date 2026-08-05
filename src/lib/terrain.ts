import type { LatLon } from './geo'

const METERS_TO_FT = 3.28084

// In-memory only (cleared on reload) — keyed to ~100m so repeated GPS
// ticks over the same patch of ground don't refetch. Only successes are
// cached; a failed lookup is retried next time rather than permanently
// treated as "unknown" for that spot.
const cache = new Map<string, number>()

function cacheKey(p: LatLon): string {
  return `${p.lat.toFixed(3)},${p.lon.toFixed(3)}`
}

// Ground elevation under a point, in feet — used to convert the aircraft's
// GPS altitude (AMSL) into actual height above ground for glide-range
// math, since raw AMSL altitude alone overstates glide range wherever
// terrain sits well above sea level (a real gap over Norwegian mountains).
//
// Sourced from Open Topo Data's free EU-DEM dataset (25m resolution,
// covers all of Norway and Sweden, no API key) rather than Kartverket
// (more accurate, but Norway-only) or Lantmäteriet (Sweden, requires an
// account) — one provider covering both countries this app targets was
// worth more here than higher precision in only one of them.
export async function fetchGroundElevationFt(point: LatLon): Promise<number | null> {
  const key = cacheKey(point)
  const cached = cache.get(key)
  if (cached !== undefined) return cached

  try {
    const res = await fetch(
      `https://api.opentopodata.org/v1/eudem25m?locations=${point.lat.toFixed(5)},${point.lon.toFixed(5)}`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) throw new Error(`Open Topo Data returned ${res.status}`)
    const data = await res.json()
    const meters = data?.results?.[0]?.elevation
    if (typeof meters !== 'number') throw new Error('No elevation in response')
    const feet = meters * METERS_TO_FT
    cache.set(key, feet)
    return feet
  } catch {
    return null
  }
}
