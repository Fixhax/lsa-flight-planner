import type { FuelType } from '../types/aircraft'

// Avgas (100LL) is commonly figured at ~0.72 kg per litre, Jet A/A-1 at
// ~0.8 kg per litre, both at standard temperature. Actual density varies a
// little with fuel temperature, so treat these as planning approximations,
// not precision figures.
export const FUEL_DENSITY_KG_PER_L: Record<FuelType, number> = {
  avgas: 0.72,
  jetA: 0.8
}

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
  mtowKg: number,
  fuelType: FuelType = 'avgas'
): WeightBreakdown {
  const fuelWeightKg = fuelOnBoardL * FUEL_DENSITY_KG_PER_L[fuelType]
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
