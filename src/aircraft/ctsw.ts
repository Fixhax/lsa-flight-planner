import type { AircraftProfile } from '../types/aircraft'

// Figures from Flight Design's official CTSW Aircraft Operating Instructions
// (Rotax 912 ULS): cruise speed at 75% power at 600kg gross, and the POH's
// stated total/usable fuel split. Empty weight and climb rate corroborated
// by independent manufacturer-spec listings.
export const ctsw: AircraftProfile = {
  id: 'flight-design-ctsw',
  displayName: 'CTSW',
  manufacturer: 'Flight Design',
  category: 'airplane',
  fuelType: 'avgas',

  cruiseTasKt: 112, // POH: cruise speed at 75% power, 600kg gross
  fuelBurnLph: 18.9, // ~5 US gal/h at cruise power
  climbRateFpm: 1000,

  fuelCapacityL: 130, // 34 US gal total (2 x 65L wing tanks)
  unusableFuelL: 6, // 124L usable per POH
  reserveMinutes: 30,

  emptyWeightKg: 270,
  maxTakeoffWeightKg: 600,
  // Per user: all three standard Norwegian microlight/LSA registration
  // weight categories should be selectable for every airplane in this app —
  // which one actually applies is about how a given airframe is
  // registered/equipped, not the aircraft type itself.
  mtowCategoriesKg: [
    { weightKg: 450, label: '450 kg (microlight)' },
    { weightKg: 560, label: '560 kg' },
    { weightKg: 600, label: '600 kg (LSA/ultralight)' }
  ],

  glideRatio: 14.1, // published CTSW glide ratio, 1:14.1
  bestGlideSpeedKt: 63, // per POH

  notes:
    'Rotax 912 ULS configuration. Cruise figure is the POH value at 75% power and 600kg gross \u2014 lighter registration categories will cruise differently. Verify against your aircraft\u2019s POH.'
}
