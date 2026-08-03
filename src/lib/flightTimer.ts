// A flight session is one "engine running" period (start-up to shutdown),
// which can contain multiple legs (takeoff to landing) — this matches how
// bush flying actually works: engine can stay running through a quick stop
// rather than a full shutdown/restart between every landing.

export interface FlightLegRecord {
  id: string
  takeoffAt: number // epoch ms
  landingAt?: number
}

export interface EngineSession {
  id: string
  startupAt: number // epoch ms
  shutdownAt?: number
  legs: FlightLegRecord[]
}

export type TimerAction = 'start-engine' | 'takeoff' | 'landing' | 'shutdown-engine'

export function currentSession(sessions: EngineSession[]): EngineSession | undefined {
  const last = sessions[sessions.length - 1]
  return last && last.shutdownAt === undefined ? last : undefined
}

export function currentLeg(session: EngineSession | undefined): FlightLegRecord | undefined {
  if (!session) return undefined
  const last = session.legs[session.legs.length - 1]
  return last && last.landingAt === undefined ? last : undefined
}

/** What action(s) make sense right now, given the recorded sessions. */
export function nextActions(sessions: EngineSession[]): TimerAction[] {
  const session = currentSession(sessions)
  if (!session) return ['start-engine']
  const leg = currentLeg(session)
  if (!leg) return ['takeoff', 'shutdown-engine'] // engine running, on ground, not airborne yet
  if (leg.landingAt === undefined) return ['landing'] // airborne — can't shut down mid-flight
  return ['takeoff', 'shutdown-engine'] // landed, engine still running: quick stop or full shutdown
}

export interface LogbookSummary {
  totalEngineMinutes: number
  totalFlightMinutes: number
  legCount: number
  sessionCount: number
}

export function summarize(sessions: EngineSession[], now: number = Date.now()): LogbookSummary {
  let totalEngineMinutes = 0
  let totalFlightMinutes = 0
  let legCount = 0

  for (const s of sessions) {
    const end = s.shutdownAt ?? now
    totalEngineMinutes += (end - s.startupAt) / 60000
    for (const leg of s.legs) {
      const legEnd = leg.landingAt ?? now
      totalFlightMinutes += (legEnd - leg.takeoffAt) / 60000
      legCount++
    }
  }

  return { totalEngineMinutes, totalFlightMinutes, legCount, sessionCount: sessions.length }
}

export function formatHM(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
  const m = Math.round(totalMinutes % 60)
  return `${h}h ${m.toString().padStart(2, '0')}m`
}

/** Decimal hours to one place — the format most paper/digital logbooks want. */
export function formatDecimalHours(totalMinutes: number): string {
  return (totalMinutes / 60).toFixed(1)
}

export function formatClock(epochMs: number): string {
  const d = new Date(epochMs)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}
