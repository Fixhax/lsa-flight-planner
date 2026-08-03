import type { AircraftProfile } from '../types/aircraft'
import { savannahS } from './savannah-s'
import { ctsw } from './ctsw'
import { ransS6 } from './rans-s6'

// To add another light sport aircraft:
//   1. Create src/aircraft/<your-aircraft>.ts modeled on savannah-s.ts
//   2. Import it below and add it to this array
// The aircraft picker in the UI updates automatically.
export const aircraftRegistry: AircraftProfile[] = [savannahS, ctsw, ransS6]

export function getAircraftById(id: string): AircraftProfile | undefined {
  return aircraftRegistry.find((a) => a.id === id)
}
