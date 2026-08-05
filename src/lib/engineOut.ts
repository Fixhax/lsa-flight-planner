import { destinationPoint, distanceNm, type LatLon } from './geo'
import { FT_PER_NM, type GlideResult } from './glide'
import type { AirstripEntry } from '../data/strips'

export interface EngineOutTarget {
  strip: AirstripEntry
  distanceNm: number
  marginFt: number // how much glide slack is left at the strip's edge of the wind-shifted circle — tight when small, comfortable when large
}

// Ranks every curated strip that falls inside the same wind-shifted glide
// footprint already drawn on the map (circle center shifted downwind by
// the glide's drift, radius unchanged — see lib/glide.ts) by straight-line
// distance from the aircraft, nearest first. Doesn't second-guess that
// circle's own (deliberately simple) model — a strip just outside it is
// treated as unreachable.
export function findReachableAirfields(
  position: LatLon,
  glide: GlideResult,
  strips: AirstripEntry[]
): EngineOutTarget[] {
  if (glide.radiusNm <= 0) return []
  const center = destinationPoint(position, glide.downwindBearingDeg, glide.driftNm)

  return strips
    .map((strip) => ({
      strip,
      distanceNm: distanceNm(position, strip),
      centerDistanceNm: distanceNm(center, strip)
    }))
    .filter((c) => c.centerDistanceNm <= glide.radiusNm)
    .sort((a, b) => a.distanceNm - b.distanceNm)
    .map((c) => ({
      strip: c.strip,
      distanceNm: c.distanceNm,
      marginFt: (glide.radiusNm - c.centerDistanceNm) * FT_PER_NM
    }))
}

export interface UnverifiedSite {
  kind: 'field' | 'road'
  points: LatLon[]
}

const MAX_SITES = 80

// Best-effort, UNVERIFIED off-airport landing candidates, queried live
// from OpenStreetMap via the free public Overpass API (no key). This is
// only ever a visual reference layer, never an auto-selected target —
// it has no knowledge of power lines/poles, slope, crop height, surface
// condition, fences, or road traffic/barriers, and OSM's own data can be
// outdated or incomplete. Every result needs a real visual assessment
// before committing to it.
export async function fetchUnverifiedLandingSites(center: LatLon, radiusNm: number): Promise<UnverifiedSite[]> {
  const radiusM = Math.round(radiusNm * 1852)
  const query = `[out:json][timeout:15];(way["landuse"~"^(farmland|meadow|grass)$"](around:${radiusM},${center.lat},${center.lon});way["highway"~"^(trunk|primary|secondary)$"](around:${radiusM},${center.lat},${center.lon}););out geom;`

  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: query,
    signal: AbortSignal.timeout(15000)
  })
  if (!res.ok) throw new Error(`Overpass returned ${res.status}`)
  const data = await res.json()
  const elements = (data?.elements ?? []) as {
    tags?: Record<string, string>
    geometry?: { lat: number; lon: number }[]
  }[]

  return elements
    .filter((el) => el.geometry && el.geometry.length >= 2)
    .slice(0, MAX_SITES)
    .map((el) => ({
      kind: el.tags?.highway ? ('road' as const) : ('field' as const),
      points: el.geometry!.map((g) => ({ lat: g.lat, lon: g.lon }))
    }))
}
