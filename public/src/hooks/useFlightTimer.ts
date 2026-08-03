import { useEffect, useState } from 'react'
import {
  currentSession,
  currentLeg,
  nextActions,
  summarize,
  type EngineSession,
  type TimerAction
} from '../lib/flightTimer'

let idCounter = 1
const nextId = () => `t-${idCounter++}`

export function useFlightTimer(onStatusChange?: (status: string | null) => void) {
  const [sessions, setSessions] = useState<EngineSession[]>([])
  const [, forceTick] = useState(0) // keeps elapsed-time displays live without a heavyweight timer

  const session = currentSession(sessions)
  const leg = currentLeg(session)
  const actions: TimerAction[] = nextActions(sessions)
  const summary = summarize(sessions)

  useEffect(() => {
    if (!onStatusChange) return
    if (leg && !leg.landingAt) onStatusChange('Airborne')
    else if (session) onStatusChange('Engine running')
    else onStatusChange(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, session?.shutdownAt, leg?.id, leg?.landingAt])

  if ((session && !leg?.landingAt) || leg) {
    setTimeout(() => forceTick((n) => n + 1), 1000)
  }

  function startEngine() {
    setSessions((prev) => [...prev, { id: nextId(), startupAt: Date.now(), legs: [] }])
  }

  function takeoff() {
    setSessions((prev) => {
      const next = [...prev]
      const s = next[next.length - 1]
      next[next.length - 1] = { ...s, legs: [...s.legs, { id: nextId(), takeoffAt: Date.now() }] }
      return next
    })
  }

  function landing() {
    setSessions((prev) => {
      const next = [...prev]
      const s = next[next.length - 1]
      const legs = [...s.legs]
      legs[legs.length - 1] = { ...legs[legs.length - 1], landingAt: Date.now() }
      next[next.length - 1] = { ...s, legs }
      return next
    })
  }

  function shutdownEngine() {
    setSessions((prev) => {
      const next = [...prev]
      next[next.length - 1] = { ...next[next.length - 1], shutdownAt: Date.now() }
      return next
    })
  }

  function reset() {
    if (sessions.length === 0 || confirm('Clear all recorded times for this trip?')) {
      setSessions([])
    }
  }

  return { sessions, session, leg, actions, summary, startEngine, takeoff, landing, shutdownEngine, reset }
}
