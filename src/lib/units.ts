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

// Fuel burn rate is always stored internally as litres/hour (see
// AircraftProfile.fuelBurnLph) — this only affects display. Only relevant
// for Jet A aircraft in practice, where kg/h is the more usual figure;
// avgas aircraft just show L/h.
export type FuelBurnUnit = 'lph' | 'kgph'

export const fuelBurnUnitLabel: Record<FuelBurnUnit, string> = {
  lph: 'L/h',
  kgph: 'kg/h'
}

/** Converts a burn rate stored in L/h to the given display unit, using the aircraft's fuel density. */
export function lphToFuelBurnUnit(lph: number, unit: FuelBurnUnit, densityKgPerL: number): number {
  return unit === 'kgph' ? lph * densityKgPerL : lph
}
