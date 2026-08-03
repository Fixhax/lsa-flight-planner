import type { Wind } from './wind'

const FT_PER_NM = 6076.12

export interface GlideResult {
  radiusNm: number // still-air glide distance — this sets the circle radius, and is unaffected by wind
  driftNm: number // how far the wind shifts the circle's center
  downwindBearingDeg: number // direction the circle center is shifted (the direction wind is blowing toward)
  maxReachNm: number // furthest point of the circle from the start: radiusNm + driftNm
  minReachNm: number // closest edge of the circle from the start: max(0, radiusNm - driftNm)
}

/**
 * Models engine-out glide range as a circle: the still-air glide distance
 * sets the radius (altitude * glide ratio), and wind simply shifts where
 * that circle is centered — it doesn't change its size. This falls
 * directly out of the vector math (ground track = airspeed vector + wind
 * vector, integrated over the glide time), so it's a solid approximation
 * despite being simple to compute.
 */
export function computeGlide(
  altitudeFt: number,
  glideRatio: number,
  bestGlideSpeedKt: number,
  wind: Wind
): GlideResult {
  const radiusNm = (altitudeFt * glideRatio) / FT_PER_NM
  const glideTimeHours = bestGlideSpeedKt > 0 ? radiusNm / bestGlideSpeedKt : 0
  const driftNm = wind.speedKt * glideTimeHours
  const downwindBearingDeg = (wind.directionTrueDeg + 180) % 360

  return {
    radiusNm,
    driftNm,
    downwindBearingDeg,
    maxReachNm: radiusNm + driftNm,
    minReachNm: Math.max(0, radiusNm - driftNm)
  }
}
