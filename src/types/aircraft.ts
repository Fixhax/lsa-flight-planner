// Every supported aircraft implements this shape. Add a new file in
// src/aircraft/ and register it in src/aircraft/registry.ts to support
// another light sport aircraft type — nothing else in the app needs to change.
export interface AircraftProfile {
  id: string
  displayName: string
  manufacturer: string

  // Performance
  cruiseTasKt: number // true airspeed at typical cruise power, knots
  fuelBurnLph: number // fuel burn at cruise power, litres/hour
  climbRateFpm: number // feet per minute, for reference on the summary card

  // Fuel
  fuelCapacityL: number
  unusableFuelL: number
  reserveMinutes: number // planning reserve to hold back (e.g. 30 min VFR day)

  // Optional long-range tank configuration, if the airframe offers one.
  // When set, the UI offers a toggle to plan with these figures instead.
  extendedFuelCapacityL?: number
  extendedUnusableFuelL?: number

  // Engine-out glide performance
  glideRatio: number // best L/D, e.g. 11 for 11:1
  bestGlideSpeedKt: number
  bestGlideSpeedIsEstimate?: boolean // true when derived (e.g. ~1.3x Vso) rather than a published POH figure

  // Weight (for the weight & balance module, coming later)
  emptyWeightKg: number
  maxTakeoffWeightKg: number

  notes?: string
}
