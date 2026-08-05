import type { AircraftProfile } from '../types/aircraft'

// Figures sourced from ICP's factory specifications for the Savannah S
// (Rotax 912 ULS, standard 2x36L + 6L reserve tank set). MTOW varies by
// registration category (450 kg microlight vs 600 kg LSA/ultralight) —
// confirm against your specific aircraft's POH and weight & balance
// before using this for real planning.
export const savannahS: AircraftProfile = {
  id: 'icp-savannah-s',
  displayName: 'Savannah S',
  manufacturer: 'ICP Aviazione',
  category: 'airplane',
  fuelType: 'avgas',

  cruiseTasKt: 97, // 179 km/h at 75% power
  fuelBurnLph: 18.5, // consumption at 75% power
  climbRateFpm: 1200,

  fuelCapacityL: 78, // 2 x 36L + 6L reserve, standard tanks
  unusableFuelL: 2,
  reserveMinutes: 30, // adjust to your local VFR day/night reserve rule

  // ICP offers a long-range tank option on some Savannah S builds. The
  // figure below is an estimate (roughly double standard capacity, based on
  // a US dealer listing) rather than a confirmed factory spec — treat it as
  // a placeholder and correct it against your own aircraft's documentation.
  extendedFuelCapacityL: 144,
  extendedUnusableFuelL: 4,

  glideRatio: 11, // published glide ratio, 1:11
  bestGlideSpeedKt: 55, // 63 mph per POH, converted to knots

  emptyWeightKg: 286,
  maxTakeoffWeightKg: 450, // set to 600 if registered under a 600kg category

  notes:
    'Standard-tank Rotax 912 ULS configuration. Verify all figures against your aircraft\u2019s POH — extended tanks, 80hp engine variant, and MTOW category all change these numbers.'
}
