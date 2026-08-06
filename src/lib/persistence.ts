// Keeps your flight plan across refreshes and browser restarts — this app
// has no backend, so localStorage is the only place this can live. Only
// the actual planning data is kept; transient things (GPS position, timer
// sessions, which section menu is open, fullscreen state) reset on reload
// on purpose, since those don't make sense to restore.

const STORAGE_KEY = 'lsa-planner-state-v1'

export interface PersistedPlan {
  aircraftId?: string
  waypoints?: unknown // typed loosely here to avoid a circular import with planning.ts
  wind?: { directionTrueDeg: number; speedKt: number }
  cruiseSpeedKt?: number
  cruiseAltitudeFt?: number
  speedUnit?: string
  windSpeedUnit?: string
  fuelBurnUnit?: string
  extendedTanks?: boolean
  fuelOnBoardL?: number
  reserveMinutes?: number
  pilotKg?: number
  passengerKg?: number
  luggageKg?: number
  mtowKg?: number
  emptyWeightKg?: number
  fuelBurnLph?: number
}

let cachedLoad: PersistedPlan | null | undefined

/** Reads and parses once, then caches — cheap to call from many initializers. */
export function loadPersistedPlan(): PersistedPlan | null {
  if (cachedLoad !== undefined) return cachedLoad
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    cachedLoad = raw ? (JSON.parse(raw) as PersistedPlan) : null
  } catch {
    // Corrupt data, storage disabled (private browsing), or quota issues —
    // fall back to normal defaults rather than breaking the app.
    cachedLoad = null
  }
  return cachedLoad
}

export function savePersistedPlan(plan: PersistedPlan): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plan))
  } catch {
    // Ignore — e.g. private browsing mode or storage full. Not saving
    // silently is better than crashing the app over it.
  }
}

export function clearPersistedPlan(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
  cachedLoad = null
}
