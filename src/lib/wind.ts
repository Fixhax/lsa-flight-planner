export interface Wind {
  directionTrueDeg: number // direction wind is blowing FROM, true degrees
  speedKt: number
}

export interface WindTriangleResult {
  windCorrectionAngleDeg: number // + = correct right, - = correct left
  trueHeadingDeg: number
  groundSpeedKt: number
}

/**
 * Classic E6B wind-triangle solution: given a true course, true airspeed,
 * and wind, returns the heading to fly and the resulting ground speed.
 */
export function solveWindTriangle(
  trueCourseDeg: number,
  tasKt: number,
  wind: Wind
): WindTriangleResult {
  if (tasKt <= 0) {
    return { windCorrectionAngleDeg: 0, trueHeadingDeg: trueCourseDeg, groundSpeedKt: 0 }
  }

  const toRad = (d: number) => (d * Math.PI) / 180
  const toDeg = (r: number) => (r * 180) / Math.PI

  // Angle between the wind (blowing FROM) and the course line.
  const windAngle = toRad(wind.directionTrueDeg - trueCourseDeg)

  // Crosswind component pushes the aircraft off course; solve the angle
  // needed to correct for it.
  const sinWca = (wind.speedKt * Math.sin(windAngle)) / tasKt
  const clamped = Math.max(-1, Math.min(1, sinWca))
  const wcaRad = Math.asin(clamped)
  const wcaDeg = toDeg(wcaRad)

  const trueHeadingDeg = (trueCourseDeg + wcaDeg + 360) % 360

  const groundSpeedKt =
    tasKt * Math.cos(wcaRad) - wind.speedKt * Math.cos(windAngle)

  return {
    windCorrectionAngleDeg: wcaDeg,
    trueHeadingDeg,
    groundSpeedKt: Math.max(0, groundSpeedKt)
  }
}
