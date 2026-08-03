import type { AircraftProfile } from '../types/aircraft'

// The S-6 is a kit-built aircraft with wide spec variance by builder, wing
// option, and engine choice. These figures reflect the commonly cited
// Rotax 912 ULS configuration (RANS' own published cruise/burn numbers,
// plus the standard LSA-category empty/gross weights) — an individual
// aircraft can differ meaningfully from this, so treat it as a starting
// point and correct it against your own aircraft's weight & balance data.
export const ransS6: AircraftProfile = {
  id: 'rans-s6',
  displayName: 'RANS S-6 Coyote II',
  manufacturer: 'RANS Aircraft',

  cruiseTasKt: 95, // RANS' published cruise for the 912ULS-equipped S-6
  fuelBurnLph: 18.9, // ~5 US gal/h at that cruise setting
  climbRateFpm: 1000,

  fuelCapacityL: 68, // 18 US gal total (standard wing tanks)
  unusableFuelL: 4,
  reserveMinutes: 30,

  emptyWeightKg: 317, // ~700 lb, LSA-category 912ULS build
  maxTakeoffWeightKg: 600,

  glideRatio: 9, // published glide ratio for the 912-series-powered S-6, 1:9
  bestGlideSpeedKt: 43, // 50 mph per POH, converted to knots

  notes:
    'Kit-built aircraft \u2014 empty weight, fuel capacity, and even cruise speed vary noticeably by builder, wing option, and engine. These figures assume a 912ULS-equipped S-6ES/S-6LS; correct them against your own aircraft\u2019s documentation and weight & balance.'
}
