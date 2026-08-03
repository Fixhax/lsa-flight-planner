export type SpeedUnit = 'kt' | 'mph' | 'kmh' | 'ms'

// How many of each unit equal one knot.
const UNITS_PER_KT: Record<SpeedUnit, number> = {
  kt: 1,
  mph: 1.15078,
  kmh: 1.852,
  ms: 0.514444
}

export const speedUnitLabel: Record<SpeedUnit, string> = {
  kt: 'kt',
  mph: 'mph',
  kmh: 'km/h',
  ms: 'm/s'
}

/** Converts a speed stored internally in knots to the given display unit. */
export function ktToUnit(kt: number, unit: SpeedUnit): number {
  return kt * UNITS_PER_KT[unit]
}

/** Converts a speed entered in the given unit back to knots for storage/math. */
export function unitToKt(value: number, unit: SpeedUnit): number {
  return value / UNITS_PER_KT[unit]
}
