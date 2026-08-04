// Queries OpenAIP's Core API (structured airspace data — polygons, class,
// type, vertical limits — not the raster map tile overlay used elsewhere in
// this app) for airspaces around a point, and works out the highest
// altitude you could climb to there before entering one that needs ATC
// clearance or must be avoided (restricted/danger/prohibited). This is a
// planning aid built on OpenAIP's community-maintained dataset around a
// single point — not exhaustive or authoritative. Always cross-check the
// current AIP before relying on it.

const CORE_API_BASE = 'https://api.core.openaip.net/api'

// icaoClass: 0=A 1=B 2=C 3=D 4=E 5=F 6=G 8=Unclassified/SUA. Class A-D
// airspace needs an ATC clearance to enter under VFR. type: 1=Restricted
// 2=Danger 3=Prohibited 4=CTR — these need permission or must be avoided
// regardless of class. Other type codes (TMA, RMZ, TMZ, FIR sectors, etc.)
// don't by themselves require a clearance to enter under VFR, so aren't
// treated as "requires permission" here.
const PERMISSION_ICAO_CLASSES = new Set([0, 1, 2, 3])
const PERMISSION_TYPES = new Set([1, 2, 3, 4])

interface RawLimit {
  referenceDatum: number // 0=GND 1=MSL 2=STD
  unit: number // 1=feet 6=flight level
  value: number
}

export interface AirspaceFrequency {
  name: string
  value: string
}

export interface NearbyAirspace {
  id: string
  name: string
  icaoClass: number
  type: number
  lowerFt: number | null
  lowerLabel: string
  upperLabel: string
  requiresPermission: boolean
  frequencies: AirspaceFrequency[]
}

export interface AirspaceCeilingResult {
  maxClimbFt: number | null
  atSurface: boolean
  limiting: NearbyAirspace | null
  nearby: NearbyAirspace[]
}

function limitToFt(limit: RawLimit | undefined): number | null {
  if (!limit) return null
  if (limit.unit === 6) return limit.value * 100 // flight level -> approx feet (standard pressure, not corrected)
  if (limit.unit === 1) return limit.value // already feet
  return null
}

function limitLabel(limit: RawLimit | undefined): string {
  if (!limit) return 'unknown'
  if (limit.unit === 6) return `FL${limit.value}`
  if (limit.value === 0 && limit.referenceDatum === 0) return 'GND'
  const suffix = limit.referenceDatum === 0 ? 'ft AGL (approx.)' : 'ft MSL'
  return `${limit.value.toLocaleString()} ${suffix}`
}

// Ray-casting point-in-polygon test against a single ring. Only checks each
// polygon's outer boundary, not any holes — airspace holes are rare and
// this keeps the geometry check simple for a planning aid.
function pointInRing(lat: number, lon: number, ring: [number, number][]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    const intersects = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    if (intersects) inside = !inside
  }
  return inside
}

function pointInGeometry(
  lat: number,
  lon: number,
  geometry: { type: string; coordinates: unknown }
): boolean {
  if (geometry.type === 'Polygon') {
    const rings = geometry.coordinates as [number, number][][]
    return pointInRing(lat, lon, rings[0])
  }
  if (geometry.type === 'MultiPolygon') {
    const polys = geometry.coordinates as [number, number][][][]
    return polys.some((poly) => pointInRing(lat, lon, poly[0]))
  }
  return false
}

const ICAO_CLASS_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
export function airspaceClassLabel(icaoClass: number | undefined): string {
  if (icaoClass === undefined) return '?'
  if (icaoClass === 8) return 'SUA'
  return ICAO_CLASS_LABELS[icaoClass] ?? String(icaoClass)
}

export async function fetchAirspaceCeiling(
  lat: number,
  lon: number,
  apiKey: string
): Promise<AirspaceCeilingResult> {
  // 27000m (~15nm) search radius around the point — generous enough that
  // any airspace actually containing the point (checked precisely below)
  // gets returned, without pulling in unrelated distant airspace.
  const url = `${CORE_API_BASE}/airspaces?pos=${lat},${lon}&dist=27000&limit=100`
  const res = await fetch(url, { headers: { 'x-openaip-api-key': apiKey } })
  if (!res.ok) {
    throw new Error(`OpenAIP airspace lookup returned ${res.status}`)
  }
  const data = await res.json()
  const items: Array<{
    _id: string
    name: string
    icaoClass: number
    type: number
    lowerLimit?: RawLimit
    upperLimit?: RawLimit
    geometry: { type: string; coordinates: unknown }
    frequencies?: { name: string; value: string }[]
  }> = data?.items ?? []

  const containing = items.filter((a) => pointInGeometry(lat, lon, a.geometry))

  const nearby: NearbyAirspace[] = containing
    .map((a) => ({
      id: a._id,
      name: a.name,
      icaoClass: a.icaoClass,
      type: a.type,
      lowerFt: limitToFt(a.lowerLimit),
      lowerLabel: limitLabel(a.lowerLimit),
      upperLabel: limitLabel(a.upperLimit),
      requiresPermission: PERMISSION_ICAO_CLASSES.has(a.icaoClass) || PERMISSION_TYPES.has(a.type),
      frequencies: (a.frequencies ?? []).map((f) => ({ name: f.name, value: f.value }))
    }))
    .filter((a) => a.requiresPermission)
    .sort((a, b) => (a.lowerFt ?? Infinity) - (b.lowerFt ?? Infinity))

  const limiting = nearby[0] ?? null

  return {
    maxClimbFt: limiting?.lowerFt ?? null,
    atSurface: !!limiting && (limiting.lowerFt ?? 0) <= 0,
    limiting,
    nearby
  }
}
