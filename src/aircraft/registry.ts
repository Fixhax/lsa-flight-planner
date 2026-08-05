import type { AircraftProfile } from '../types/aircraft'
import { savannahS } from './savannah-s'
import { ctsw } from './ctsw'
import { ransS6 } from './rans-s6'
import { aw109e } from './aw109e'

// To add another aircraft:
//   1. Create src/aircraft/<your-aircraft>.ts modeled on savannah-s.ts
//      (airplane) or aw109e.ts (helicopter)
//   2. Import it below and add it to this array
// The aircraft picker in the UI updates automatically, grouped by category.
export const aircraftRegistry: AircraftProfile[] = [savannahS, ctsw, ransS6, aw109e]

export function getAircraftById(id: string): AircraftProfile | undefined {
  return aircraftRegistry.find((a) => a.id === id)
}
