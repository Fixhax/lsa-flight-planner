// Avgas (100LL) is commonly figured at ~0.72 kg per litre at standard
// temperature. Actual density varies a little with fuel temperature, so
// treat this as a planning approximation, not a precision figure.
export const FUEL_DENSITY_KG_PER_L = 0.72

export interface WeightBreakdown {
  emptyWeightKg: number
  fuelWeightKg: number
  pilotKg: number
  passengerKg: number
  luggageKg: number
  totalWeightKg: number
  mtowKg: number
  overweightByKg: number // > 0 means over MTOW
  isOverweight: boolean
}

export function computeWeight(
  emptyWeightKg: number,
  fuelOnBoardL: number,
  pilotKg: number,
  passengerKg: number,
  luggageKg: number,
  mtowKg: number
): WeightBreakdown {
  const fuelWeightKg = fuelOnBoardL * FUEL_DENSITY_KG_PER_L
  const totalWeightKg = emptyWeightKg + fuelWeightKg + pilotKg + passengerKg + luggageKg
  const overweightByKg = totalWeightKg - mtowKg

  return {
    emptyWeightKg,
    fuelWeightKg,
    pilotKg,
    passengerKg,
    luggageKg,
    totalWeightKg,
    mtowKg,
    overweightByKg,
    isOverweight: overweightByKg > 0
  }
}
