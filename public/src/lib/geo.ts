export interface LatLon {
  lat: number // decimal degrees, +N/-S
  lon: number // decimal degrees, +E/-W
}

const EARTH_RADIUS_NM = 3440.065 // nautical miles

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI
}

/** Great-circle distance between two points, in nautical miles. */
export function distanceNm(a: LatLon, b: LatLon): number {
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)

  const sinDLat = Math.sin(dLat / 2)
  const sinDLon = Math.sin(dLon / 2)

  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon

  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
  return EARTH_RADIUS_NM * c
}

/** Initial true course from a to b, in degrees (0-360). */
export function trueCourse(a: LatLon, b: LatLon): number {
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const dLon = toRad(b.lon - a.lon)

  const y = Math.sin(dLon) * Math.cos(lat2)
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)

  const bearing = toDeg(Math.atan2(y, x))
  return (bearing + 360) % 360
}

/** Parses a decimal-degree string, returns null if invalid. */
export function parseCoord(value: string): number | null {
  const n = Number(value.trim())
  return Number.isFinite(n) ? n : null
}

/**
 * Given a start point, an initial true bearing, and a great-circle distance,
 * returns the resulting point. Used to project the wind-shifted center of
 * the engine-out glide circle.
 */
export function destinationPoint(start: LatLon, bearingDeg: number, distanceNm: number): LatLon {
  const angularDist = distanceNm / EARTH_RADIUS_NM
  const bearing = toRad(bearingDeg)
  const lat1 = toRad(start.lat)
  const lon1 = toRad(start.lon)

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDist) + Math.cos(lat1) * Math.sin(angularDist) * Math.cos(bearing)
  )
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDist) * Math.cos(lat1),
      Math.cos(angularDist) - Math.sin(lat1) * Math.sin(lat2)
    )

  return { lat: toDeg(lat2), lon: toDeg(lon2) }
}
