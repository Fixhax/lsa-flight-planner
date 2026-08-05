// Cloud counterpart to lib/persistence.ts — same flight-plan shape, but
// keyed by account instead of by browser, plus saved flight-track history.
// Every function here is a safe no-op when Supabase isn't configured, so
// callers never need to check authConfigured themselves.

import { supabase } from './supabaseClient'
import type { PersistedPlan } from './persistence'

export async function loadCloudPlan(userId: string): Promise<PersistedPlan | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('flight_plans')
    .select('data')
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !data) return null
  return data.data as PersistedPlan
}

export async function saveCloudPlan(userId: string, plan: PersistedPlan): Promise<void> {
  if (!supabase) return
  await supabase
    .from('flight_plans')
    .upsert({ user_id: userId, data: plan, updated_at: new Date().toISOString() })
}

export interface TrackPoint {
  lat: number
  lon: number
  timestamp: number
}

export interface NewFlightTrack {
  aircraftId: string | null
  startedAt: number
  endedAt: number
  distanceNm: number | null
  points: TrackPoint[]
}

export interface SavedFlightTrack extends NewFlightTrack {
  id: string
}

export async function saveFlightTrack(userId: string, track: NewFlightTrack): Promise<void> {
  if (!supabase) return
  await supabase.from('flight_tracks').insert({
    user_id: userId,
    aircraft_id: track.aircraftId,
    started_at: new Date(track.startedAt).toISOString(),
    ended_at: new Date(track.endedAt).toISOString(),
    distance_nm: track.distanceNm,
    points: track.points
  })
}

export async function deleteFlightTrack(userId: string, trackId: string): Promise<void> {
  if (!supabase) return
  await supabase.from('flight_tracks').delete().eq('id', trackId).eq('user_id', userId)
}

export interface SavedPlanEntry {
  id: string
  name: string
  updatedAt: number
  data: PersistedPlan
}

// Named, explicitly-saved snapshots — separate from the single
// always-current plan above, which keeps autosaving on its own. Requires
// an account (same as flight history); there's no local-only fallback,
// since this is a list to browse/manage rather than something that needs
// to work offline the moment you open the app.
export async function loadSavedPlans(userId: string): Promise<SavedPlanEntry[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('saved_plans')
    .select('id, name, data, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  if (error || !data) return []
  return data.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    updatedAt: new Date(row.updated_at as string).getTime(),
    data: row.data as PersistedPlan
  }))
}

export async function createSavedPlan(userId: string, name: string, plan: PersistedPlan): Promise<void> {
  if (!supabase) return
  await supabase.from('saved_plans').insert({ user_id: userId, name, data: plan })
}

export async function renameSavedPlan(userId: string, id: string, name: string): Promise<void> {
  if (!supabase) return
  await supabase.from('saved_plans').update({ name }).eq('id', id).eq('user_id', userId)
}

export async function overwriteSavedPlan(userId: string, id: string, plan: PersistedPlan): Promise<void> {
  if (!supabase) return
  await supabase
    .from('saved_plans')
    .update({ data: plan, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
}

export async function deleteSavedPlan(userId: string, id: string): Promise<void> {
  if (!supabase) return
  await supabase.from('saved_plans').delete().eq('id', id).eq('user_id', userId)
}

export async function loadFlightTracks(userId: string): Promise<SavedFlightTrack[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('flight_tracks')
    .select('id, aircraft_id, started_at, ended_at, distance_nm, points')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(50)
  if (error || !data) return []
  return data.map((row) => ({
    id: row.id as string,
    aircraftId: row.aircraft_id as string | null,
    startedAt: new Date(row.started_at as string).getTime(),
    endedAt: new Date(row.ended_at as string).getTime(),
    distanceNm: row.distance_nm as number | null,
    points: row.points as TrackPoint[]
  }))
}
