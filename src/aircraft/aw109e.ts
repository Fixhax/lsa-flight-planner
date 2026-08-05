import type { AircraftProfile } from '../types/aircraft'

// Figures cross-checked across a Conklin & de Decker-sourced spec sheet
// (via Sparfell's AW109E "Elite" trading specs, sparfell.aero), AeroCorner's
// spec listing, and a general web search for fuel burn — not a factory POH,
// so treat these as a solid planning starting point rather than certified
// performance data. This is a twin-turbine, EASA/FAA-certified helicopter
// far outside typical LSA weight limits — included here for planning use,
// not because it's an LSA.
export const aw109e: AircraftProfile = {
  id: 'agustawestland-aw109e',
  displayName: 'AW109E Power',
  manufacturer: 'AgustaWestland (now Leonardo)',
  category: 'helicopter',
  fuelType: 'jetA',

  cruiseTasKt: 140, // published "long range speed" / normal cruise; max speed is 154kt (Vne higher still)
  fuelBurnLph: 246, // ~65 US gal/h at cruise power, converted (source didn't give a kg/h or L/h figure directly)
  climbRateFpm: 1930,

  fuelCapacityL: 800, // ~220 US gal Jet A, usable capacity per source
  unusableFuelL: 0, // not independently confirmed — treated as included in the 800L figure above
  reserveMinutes: 30, // generic planning default — adjust to your operator's actual reserve rule

  emptyWeightKg: 1939, // "Basic Operating Weight" per source, which may include crew/standard equipment beyond a pure empty weight — override this in the app to match your actual aircraft's weighed empty weight
  maxTakeoffWeightKg: 2850,
  mtowCategoriesKg: [
    { weightKg: 2850, label: '2,850 kg (standard, internal load)' },
    { weightKg: 2750, label: '2,750 kg (HEC — per user, not independently verified)' },
    { weightKg: 3000, label: '3,000 kg (external sling load)' }
  ],

  // No glideRatio/bestGlideSpeedKt: engine-out for a helicopter means
  // entering autorotation, which doesn't behave like a fixed-wing glide —
  // modeling it as a simple L/D circle would misrepresent real performance,
  // so the glide-range feature is just not shown for this aircraft rather
  // than guessing at a number.

  notes:
    'Performance figures are cross-checked estimates from public spec sheets, not a factory POH/RFM — verify against the actual aircraft’s flight manual before real planning. MTOW: 2,850kg is the commonly published internal-load figure; a reduced 2,750kg "HEC" limit was provided by a user of this app and hasn’t been independently verified by source — confirm which applies to your specific aircraft/operation. Fuel burn rate can be shown in kg/h instead of L/h (see the toggle next to it), since Jet A is usually measured by weight.'
}
