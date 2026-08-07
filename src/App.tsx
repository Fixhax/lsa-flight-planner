import { useEffect, useMemo, useRef, useState } from 'react'
import { aircraftRegistry, getAircraftById } from './aircraft/registry'
import type { AircraftCategory } from './types/aircraft'
import { formatMinutes, planRoute, MIN_RESERVE_MINUTES, type Waypoint } from './lib/planning'
import type { Wind } from './lib/wind'
import FuelGauge from './components/FuelGauge'
import NavLogView from './components/NavLog'
import StripSearch from './components/StripSearch'
import WeightSummary from './components/WeightSummary'
import RouteMap from './components/RouteMap'
import NumberStepper from './components/NumberStepper'
import { airstrips, type AirstripEntry } from './data/strips'
import {
  ktToUnit,
  unitToKt,
  speedUnitLabel,
  fuelBurnUnitLabel,
  lphToFuelBurnUnit,
  type SpeedUnit,
  type FuelBurnUnit
} from './lib/units'
import { computeWeight, FUEL_DENSITY_KG_PER_L } from './lib/weight'
import { computeGlide } from './lib/glide'
import { fetchGroundElevationFt } from './lib/terrain'
import { findReachableAirfields, fetchUnverifiedLandingSites, type EngineOutTarget, type UnverifiedSite } from './lib/engineOut'
import GlideSummary from './components/GlideSummary'
import WeatherFetch from './components/WeatherFetch'
import DaylightInfo from './components/DaylightInfo'
import FlightPlanTool from './components/FlightPlanTool'
import FlightTimer from './components/FlightTimer'
import TimerActionBar from './components/TimerActionBar'
import { useFlightTimer } from './hooks/useFlightTimer'
import { useGpsTracking } from './hooks/useGpsTracking'
import { useWakeLock } from './hooks/useWakeLock'
import LiveTracking from './components/LiveTracking'
import type { LivePosition } from './lib/liveTracking'
import SectionMenu from './components/SectionMenu'
import WeatherReport from './components/WeatherReport'
import RadioFrequencies from './components/RadioFrequencies'
import { computeTrafficPattern, parseRunwayEnds } from './lib/trafficPattern'
import { loadPersistedPlan, savePersistedPlan, type PersistedPlan } from './lib/persistence'
import { useAuth } from './lib/authContext'
import { loadCloudPlan, saveCloudPlan, saveFlightTrack, type SavedFlightTrack } from './lib/cloudSync'
import { distanceNm } from './lib/geo'
import FlightHistory from './components/FlightHistory'
import SavedPlans from './components/SavedPlans'
import Help from './components/Help'
import Bearing from './components/Bearing'
import Checklist from './components/Checklist'
import MetarTaf from './components/MetarTaf'
import { applyTheme, getInitialTheme, type Theme } from './lib/theme'

// crypto.randomUUID() rather than an incrementing counter — a counter
// resets to 1 on every page load, while persisted waypoints (loaded back
// from localStorage or the cloud) keep whatever ids they were created
// with. A returning session could then mint new waypoints with ids that
// collide with existing ones, which broke id-based lookups like the map's
// midpoint-drag-handle insert (waypoints.findIndex by id) and duplicated
// React list keys.
function makeWaypoint(strip?: AirstripEntry): Waypoint {
  return {
    id: crypto.randomUUID(),
    name: strip ? (strip.icao ? `${strip.name} (${strip.icao})` : strip.name) : '',
    lat: strip?.lat ?? 0,
    lon: strip?.lon ?? 0,
    elevationFt: strip?.elevationFt,
    runway: strip?.runway,
    pprContact: strip?.pprContact,
    country: strip?.country,
    icao: strip?.icao,
    customsCleared: strip?.customsCleared,
    frequencies: strip?.frequencies
  }
}

const SPEED_UNIT_OPTIONS: { value: SpeedUnit; label: string }[] = [
  { value: 'kt', label: 'knots' },
  { value: 'mph', label: 'mph' },
  { value: 'kmh', label: 'km/h' },
  { value: 'ms', label: 'm/s' }
]

// Grouped by when you'd actually reach for each one, not by topic —
// pre-flight planning happens on the ground with time to think; in-flight
// tools need to be found fast and read at a glance, so that group is kept
// short and ordered by how often each gets touched in the air. Route & map
// appears in both Pre-flight and In-flight since it's genuinely used
// throughout — planned on the ground, then flown from in the air.
const SECTION_GROUPS: { label: string; sections: { id: string; label: string }[] }[] = [
  {
    label: 'Pre-flight planning',
    sections: [
      { id: 'aircraft', label: 'Aircraft' },
      { id: 'cruise', label: 'Cruise settings' },
      { id: 'wind', label: 'Wind' },
      { id: 'fuel', label: 'Fuel' },
      { id: 'weight', label: 'Payload & weight' },
      { id: 'route', label: 'Route & map' },
      { id: 'glide', label: 'Glide range' },
      { id: 'weatherreport', label: 'Weather report' },
      { id: 'metartaf', label: 'METAR / TAF' },
      { id: 'frequencies', label: 'Radio frequencies' },
      { id: 'flightplan', label: 'Flight plan' },
      { id: 'daylight', label: 'Daylight' },
      { id: 'checklist', label: 'Checklist' },
      { id: 'savedplans', label: 'Saved plans' }
    ]
  },
  {
    label: 'In-flight',
    sections: [
      { id: 'route', label: 'Route & map' },
      { id: 'live', label: 'Live tracking' },
      { id: 'timer', label: 'Flight timer (logbook)' },
      { id: 'bearing', label: 'Bearing & track' },
      { id: 'navlog', label: 'Nav log' },
      { id: 'totals', label: 'Totals' }
    ]
  },
  {
    label: 'Post-flight',
    sections: [{ id: 'history', label: 'Flight history' }]
  },
  {
    label: 'Reference',
    sections: [{ id: 'help', label: 'Help & disclaimers' }]
  }
]

export default function App() {
  const persisted = loadPersistedPlan()
  const session = useAuth()
  const userId = session?.user.id ?? null

  const [aircraftId, setAircraftId] = useState(persisted?.aircraftId ?? aircraftRegistry[0].id)
  const [waypoints, setWaypoints] = useState<Waypoint[]>(
    (persisted?.waypoints as Waypoint[] | undefined)?.length
      ? (persisted!.waypoints as Waypoint[])
      : [makeWaypoint(), makeWaypoint()]
  )
  const [wind, setWind] = useState<Wind>(persisted?.wind ?? { directionTrueDeg: 0, speedKt: 0 })
  const [cruiseSpeedKt, setCruiseSpeedKt] = useState(
    persisted?.cruiseSpeedKt ?? aircraftRegistry[0].cruiseTasKt
  )
  const [cruiseAltitudeFt, setCruiseAltitudeFt] = useState(persisted?.cruiseAltitudeFt ?? 2000)
  const [speedUnit, setSpeedUnit] = useState<SpeedUnit>((persisted?.speedUnit as SpeedUnit) ?? 'kt')
  const [windSpeedUnit, setWindSpeedUnit] = useState<SpeedUnit>(
    (persisted?.windSpeedUnit as SpeedUnit) ?? 'kt'
  )
  // Only shown/relevant for Jet A aircraft (kg/h is the more usual figure
  // there) — avgas aircraft always just show L/h regardless of this.
  const [fuelBurnUnit, setFuelBurnUnit] = useState<FuelBurnUnit>(
    (persisted?.fuelBurnUnit as FuelBurnUnit) ?? 'lph'
  )
  const [extendedTanks, setExtendedTanks] = useState(persisted?.extendedTanks ?? false)
  const [fuelOnBoardL, setFuelOnBoardL] = useState(
    persisted?.fuelOnBoardL ?? aircraftRegistry[0].fuelCapacityL - aircraftRegistry[0].unusableFuelL
  )
  const [reserveMinutes, setReserveMinutes] = useState(
    persisted?.reserveMinutes ?? aircraftRegistry[0].reserveMinutes
  )
  const [pilotKg, setPilotKg] = useState(persisted?.pilotKg ?? 80)
  const [passengerKg, setPassengerKg] = useState(persisted?.passengerKg ?? 0)
  const [luggageKg, setLuggageKg] = useState(persisted?.luggageKg ?? 0)
  const [mtowKg, setMtowKg] = useState(persisted?.mtowKg ?? aircraftRegistry[0].maxTakeoffWeightKg)
  // Overridable — a real aircraft's equipped empty weight (avionics,
  // interior, etc.) often differs from the registry's published figure.
  const [emptyWeightKg, setEmptyWeightKg] = useState(
    persisted?.emptyWeightKg ?? aircraftRegistry[0].emptyWeightKg
  )
  // Overridable — published burn-rate specs are averages; a real
  // aircraft/engine's actual consumption varies with mixture leaning,
  // power setting, and engine condition.
  const [fuelBurnLph, setFuelBurnLph] = useState(
    persisted?.fuelBurnLph ?? aircraftRegistry[0].fuelBurnLph
  )

  // Applies a PersistedPlan-shaped snapshot onto the working state — shared
  // by the cloud-hydrate-on-sign-in effect below and by "Load" in the
  // Saved plans panel, so there's exactly one place that knows how to
  // unpack this shape. Only touches fields that are actually present, same
  // partial-merge behavior either caller needs.
  function applyPersistedPlan(plan: PersistedPlan) {
    if (plan.aircraftId !== undefined) setAircraftId(plan.aircraftId)
    if ((plan.waypoints as Waypoint[] | undefined)?.length) {
      setWaypoints(plan.waypoints as Waypoint[])
    }
    if (plan.wind) setWind(plan.wind)
    if (plan.cruiseSpeedKt !== undefined) setCruiseSpeedKt(plan.cruiseSpeedKt)
    if (plan.cruiseAltitudeFt !== undefined) setCruiseAltitudeFt(plan.cruiseAltitudeFt)
    if (plan.speedUnit) setSpeedUnit(plan.speedUnit as SpeedUnit)
    if (plan.windSpeedUnit) setWindSpeedUnit(plan.windSpeedUnit as SpeedUnit)
    if (plan.fuelBurnUnit) setFuelBurnUnit(plan.fuelBurnUnit as FuelBurnUnit)
    if (plan.extendedTanks !== undefined) setExtendedTanks(plan.extendedTanks)
    if (plan.fuelOnBoardL !== undefined) setFuelOnBoardL(plan.fuelOnBoardL)
    if (plan.reserveMinutes !== undefined) setReserveMinutes(plan.reserveMinutes)
    if (plan.pilotKg !== undefined) setPilotKg(plan.pilotKg)
    if (plan.passengerKg !== undefined) setPassengerKg(plan.passengerKg)
    if (plan.luggageKg !== undefined) setLuggageKg(plan.luggageKg)
    if (plan.mtowKg !== undefined) setMtowKg(plan.mtowKg)
    if (plan.emptyWeightKg !== undefined) setEmptyWeightKg(plan.emptyWeightKg)
    if (plan.fuelBurnLph !== undefined) setFuelBurnLph(plan.fuelBurnLph)
  }

  // The inverse of applyPersistedPlan — snapshots the working state into
  // the same shape, for the continuous autosave below and for "Save as" /
  // "Overwrite" in the Saved plans panel.
  function buildCurrentPlan(): PersistedPlan {
    return {
      aircraftId,
      waypoints,
      wind,
      cruiseSpeedKt,
      cruiseAltitudeFt,
      speedUnit,
      windSpeedUnit,
      fuelBurnUnit,
      extendedTanks,
      fuelOnBoardL,
      reserveMinutes,
      pilotKg,
      passengerKg,
      luggageKg,
      mtowKg,
      emptyWeightKg,
      fuelBurnLph
    }
  }

  // Cloud-hydrate on sign-in — replaces the (possibly stale, per-browser)
  // localStorage snapshot with the authoritative saved plan for this
  // account once it arrives. A no-op when signed out or unconfigured.
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    loadCloudPlan(userId).then((cloud) => {
      if (cancelled || !cloud) return
      applyPersistedPlan(cloud)
    })
    return () => {
      cancelled = true
    }
  }, [userId])

  const cloudSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keep the plan safe across refreshes — deliberately excludes transient
  // things like GPS position, timer sessions, and which panels are open.
  // Always saved locally (instant, works offline); also pushed to the
  // account's cloud row (debounced, so typing doesn't hammer the database)
  // when signed in.
  useEffect(() => {
    const plan = buildCurrentPlan()
    savePersistedPlan(plan)

    if (userId) {
      if (cloudSaveTimerRef.current) clearTimeout(cloudSaveTimerRef.current)
      cloudSaveTimerRef.current = setTimeout(() => {
        saveCloudPlan(userId, plan)
      }, 800)
    }
  }, [
    userId,
    aircraftId,
    waypoints,
    wind,
    cruiseSpeedKt,
    cruiseAltitudeFt,
    speedUnit,
    windSpeedUnit,
    fuelBurnUnit,
    extendedTanks,
    fuelOnBoardL,
    reserveMinutes,
    pilotKg,
    passengerKg,
    luggageKg,
    mtowKg,
    emptyWeightKg,
    fuelBurnLph
  ])

  const [livePosition, setLivePosition] = useState<LivePosition | null>(null)
  const [liveStatus, setLiveStatus] = useState<string | null>(null)
  const [groundElevationFt, setGroundElevationFt] = useState<number | null>(null)
  const [engineOutActive, setEngineOutActive] = useState(false)
  const [engineOutTarget, setEngineOutTarget] = useState<EngineOutTarget | null>(null)
  const [engineOutSites, setEngineOutSites] = useState<UnverifiedSite[] | null>(null)
  const [engineOutLoading, setEngineOutLoading] = useState(false)
  const [engineOutError, setEngineOutError] = useState<string | null>(null)
  const [timerStatus, setTimerStatus] = useState<string | null>(null)
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['route']))
  // Which category tab is showing in the Aircraft panel's picker — synced
  // to match whenever the actually-selected aircraft's category changes
  // (e.g. picked from the header dropdown), but otherwise left alone so
  // browsing the other tab doesn't fight the user.
  const [aircraftCategoryTab, setAircraftCategoryTab] = useState<AircraftCategory>(
    (getAircraftById(persisted?.aircraftId ?? aircraftRegistry[0].id) ?? aircraftRegistry[0]).category
  )
  const [isMapFullscreen, setIsMapFullscreen] = useState(false)
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  function toggleTheme() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    setTheme(next)
  }

  // Guaranteed fallback exit — regardless of what else might go wrong with
  // the on-screen buttons, Escape always works.
  useEffect(() => {
    if (!isMapFullscreen) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsMapFullscreen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isMapFullscreen])

  const timer = useFlightTimer(setTimerStatus)
  const gps = useGpsTracking(setLivePosition, setLiveStatus)
  const wakeLock = useWakeLock(gps.tracking)

  // Ground elevation under the aircraft's current GPS position, refetched
  // when it's moved more than 1nm from the last lookup (or that lookup is
  // over 30s stale) — frequent enough to track terrain changes without
  // hammering the free elevation API on every single GPS tick. Feeds the
  // AGL correction below; left at null (falls back to raw AMSL altitude,
  // see liveGlide) whenever the lookup hasn't resolved yet or fails.
  const lastTerrainFetchRef = useRef<{ lat: number; lon: number; time: number } | null>(null)
  useEffect(() => {
    if (!livePosition) return
    const last = lastTerrainFetchRef.current
    const now = Date.now()
    const movedNm = last ? distanceNm(last, livePosition) : Infinity
    const staleMs = last ? now - last.time : Infinity
    if (movedNm < 1 && staleMs < 30000) return
    lastTerrainFetchRef.current = { lat: livePosition.lat, lon: livePosition.lon, time: now }
    fetchGroundElevationFt(livePosition).then((ft) => {
      if (ft !== null) setGroundElevationFt(ft)
    })
  }, [livePosition])

  // Records a GPS breadcrumb trail for the current leg — only while
  // actually airborne (between the takeoff and landing button presses), so
  // taxiing and ramp time before/after don't pollute the saved track.
  const [flightTrackPoints, setFlightTrackPoints] = useState<LivePosition[]>([])
  const [selectedHistoryTrack, setSelectedHistoryTrack] = useState<SavedFlightTrack | null>(null)
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0)
  const airborne = !!(timer.leg && !timer.leg.landingAt)

  useEffect(() => {
    if (!airborne || !livePosition) return
    setFlightTrackPoints((prev) => [...prev, livePosition])
  }, [livePosition, airborne])

  // Wraps the plain timer.landing() so logging a landing also closes out
  // and saves whatever track was recorded during that leg, then clears it
  // for the next one. Falls back to just resetting when there's nothing
  // worth saving (not enough points, or not signed in to have anywhere to
  // save it).
  function handleLanding() {
    if (userId && timer.leg && flightTrackPoints.length >= 2) {
      let distance = 0
      for (let i = 1; i < flightTrackPoints.length; i++) {
        distance += distanceNm(flightTrackPoints[i - 1], flightTrackPoints[i])
      }
      saveFlightTrack(userId, {
        aircraftId,
        startedAt: timer.leg.takeoffAt,
        endedAt: Date.now(),
        distanceNm: distance,
        points: flightTrackPoints.map((p) => ({ lat: p.lat, lon: p.lon, timestamp: p.timestamp }))
      }).then(() => setHistoryRefreshKey((k) => k + 1))
    }
    setFlightTrackPoints([])
    timer.landing()
  }

  // Landing pattern controls — start with nothing selected. Strips with a
  // known runway are candidates; the rest genuinely can't support this yet.
  const patternCapableStrips = airstrips.filter((s) => s.runway)
  const [patternStripId, setPatternStripId] = useState('')
  const [patternRunwayEnd, setPatternRunwayEnd] = useState<'A' | 'B'>('A')
  const [patternTrafficSide, setPatternTrafficSide] = useState<'left' | 'right'>('left')
  const [patternDownwindM, setPatternDownwindM] = useState(1000)
  const [patternMagVarDeg, setPatternMagVarDeg] = useState(4)

  function toggleSection(id: string) {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function ensureSectionOpen(id: string) {
    setOpenSections((prev) => (prev.has(id) ? prev : new Set(prev).add(id)))
  }

  const aircraft = getAircraftById(aircraftId) ?? aircraftRegistry[0]
  // Aircraft object with the adjustable fuel-burn override applied — for
  // the handful of consumers (the flight-plan sheet) that take a whole
  // AircraftProfile and read .fuelBurnLph internally, rather than a
  // separate parameter the way planRoute below does.
  const effectiveAircraft = { ...aircraft, fuelBurnLph }

  useEffect(() => {
    setAircraftCategoryTab(aircraft.category)
  }, [aircraft.category])

  // Drives the Fuel panel's display unit — same toggle as the Aircraft
  // summary's "Burn" line, so picking kg/h there is reflected everywhere
  // fuel quantities show up, not just the burn rate. fuelOnBoardL etc. stay
  // stored in litres regardless; fuelDisplayFactor is only for display/
  // input conversion, and is 1 (a no-op) unless actually showing kg.
  const showFuelInKg = aircraft.fuelType === 'jetA' && fuelBurnUnit === 'kgph'
  const fuelDisplayFactor = showFuelInKg ? FUEL_DENSITY_KG_PER_L[aircraft.fuelType] : 1

  const usableFuelL = useMemo(() => {
    if (extendedTanks && aircraft.extendedFuelCapacityL !== undefined) {
      return aircraft.extendedFuelCapacityL - (aircraft.extendedUnusableFuelL ?? aircraft.unusableFuelL)
    }
    return aircraft.fuelCapacityL - aircraft.unusableFuelL
  }, [aircraft, extendedTanks])

  // Reset cruise speed and fuel-on-board whenever the aircraft or tank
  // configuration changes, so switching types doesn't silently keep flying
  // the plan with the old aircraft's numbers. Fuel defaults to "full tanks"
  // for the newly selected configuration; edit it below for a partial load.
  useEffect(() => {
    setCruiseSpeedKt(aircraft.cruiseTasKt)
    setReserveMinutes(aircraft.reserveMinutes)
    setMtowKg(aircraft.maxTakeoffWeightKg)
    setEmptyWeightKg(aircraft.emptyWeightKg)
    setFuelBurnLph(aircraft.fuelBurnLph)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aircraftId])

  useEffect(() => {
    setFuelOnBoardL(usableFuelL)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usableFuelL])

  // Excludes not-yet-filled-in waypoints (lat/lon both still 0, the
  // makeWaypoint() default) the same way the map and every other
  // waypoints-consuming panel already does — otherwise a blank waypoint
  // left sitting in the list (e.g. the original default pair, after
  // "Set as start"/"Direct to"/long-press inserts real points around them)
  // corrupts the whole route: 0°N 0°E is thousands of nm from Norway, so a
  // leg to/from it blows up distance, time, and fuel burn for the entire
  // nav log.
  const validWaypoints = useMemo(
    () =>
      waypoints.filter(
        (w) => Number.isFinite(w.lat) && Number.isFinite(w.lon) && (w.lat !== 0 || w.lon !== 0)
      ),
    [waypoints]
  )

  const navLog = useMemo(
    () =>
      planRoute(
        validWaypoints,
        aircraft,
        wind,
        cruiseSpeedKt,
        usableFuelL,
        fuelOnBoardL,
        reserveMinutes,
        fuelBurnLph
      ),
    [validWaypoints, aircraft, wind, cruiseSpeedKt, usableFuelL, fuelOnBoardL, reserveMinutes, fuelBurnLph]
  )

  const selectedPatternStrip = patternCapableStrips.find((s) => s.id === patternStripId)
  const trafficPattern = useMemo(() => {
    if (!selectedPatternStrip?.runway) return null
    const ends = parseRunwayEnds(selectedPatternStrip.runway)
    if (!ends) return null
    const magHeading = patternRunwayEnd === 'A' ? ends.endA : ends.endB
    return computeTrafficPattern(
      selectedPatternStrip,
      selectedPatternStrip.lengthM ?? 500,
      magHeading,
      patternMagVarDeg,
      patternDownwindM,
      patternTrafficSide
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedPatternStrip,
    patternRunwayEnd,
    patternMagVarDeg,
    patternDownwindM,
    patternTrafficSide
  ])

  const weight = useMemo(
    () =>
      computeWeight(
        emptyWeightKg,
        fuelOnBoardL,
        pilotKg,
        passengerKg,
        luggageKg,
        mtowKg,
        aircraft.fuelType
      ),
    [emptyWeightKg, fuelOnBoardL, pilotKg, passengerKg, luggageKg, mtowKg, aircraft.fuelType]
  )

  // undefined for aircraft with no published glideRatio/bestGlideSpeedKt
  // (e.g. helicopters — see the note on those fields in types/aircraft.ts)
  // rather than showing a fabricated engine-out glide circle.
  const glide = useMemo(
    () =>
      aircraft.glideRatio !== undefined && aircraft.bestGlideSpeedKt !== undefined
        ? computeGlide(cruiseAltitudeFt, aircraft.glideRatio, aircraft.bestGlideSpeedKt, wind)
        : undefined,
    [cruiseAltitudeFt, aircraft.glideRatio, aircraft.bestGlideSpeedKt, wind]
  )

  // Height above ground, not sea level — raw GPS altitude alone overstates
  // glide range wherever terrain sits well above sea level (a real gap
  // over Norwegian mountains). undefined whenever the terrain lookup
  // hasn't resolved yet, in which case liveGlide below falls back to raw
  // AMSL altitude, same as before this existed.
  const liveAglFt =
    livePosition?.altitudeFt !== undefined && groundElevationFt !== null
      ? Math.max(0, livePosition.altitudeFt - groundElevationFt)
      : undefined

  // Same model, but using the aircraft's actual current height (AGL when
  // terrain data is available, else raw GPS altitude, else the planned
  // cruise altitude) instead of the planned cruise altitude. Drives the
  // single live glide-range circle on the map, and the engine-out
  // targeting below; the planning circles at each waypoint (from `glide`
  // above) keep using the planned altitude regardless.
  const liveGlide = useMemo(
    () =>
      aircraft.glideRatio !== undefined && aircraft.bestGlideSpeedKt !== undefined
        ? computeGlide(
            liveAglFt ?? livePosition?.altitudeFt ?? cruiseAltitudeFt,
            aircraft.glideRatio,
            aircraft.bestGlideSpeedKt,
            wind
          )
        : undefined,
    [liveAglFt, livePosition?.altitudeFt, cruiseAltitudeFt, aircraft.glideRatio, aircraft.bestGlideSpeedKt, wind]
  )

  // Recomputed reactively (cheap, local) as the aircraft moves while
  // engine-out mode is active — always picks the nearest curated strip
  // still inside the current glide footprint.
  useEffect(() => {
    if (!engineOutActive || !livePosition || !liveGlide || liveGlide.radiusNm <= 0) {
      if (engineOutActive) setEngineOutTarget(null)
      return
    }
    const targets = findReachableAirfields(livePosition, liveGlide, airstrips)
    setEngineOutTarget(targets[0] ?? null)
  }, [engineOutActive, livePosition, liveGlide])

  // Unverified fields/roads overlay — fetched once per activation (not on
  // every GPS tick) to avoid hammering the free Overpass API; a manual
  // toggle-off-then-on refreshes it.
  useEffect(() => {
    if (!engineOutActive || !livePosition || !liveGlide) return
    let cancelled = false
    setEngineOutLoading(true)
    fetchUnverifiedLandingSites(livePosition, liveGlide.maxReachNm)
      .then((sites) => {
        if (!cancelled) setEngineOutSites(sites)
      })
      .catch(() => {
        if (!cancelled) setEngineOutSites(null)
      })
      .finally(() => {
        if (!cancelled) setEngineOutLoading(false)
      })
    return () => {
      cancelled = true
    }
    // Deliberately only re-runs when engine-out is toggled, not on every
    // position update within an already-active session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineOutActive])

  function handleToggleEngineOut() {
    if (engineOutActive) {
      setEngineOutActive(false)
      setEngineOutTarget(null)
      setEngineOutSites(null)
      setEngineOutError(null)
      return
    }
    if (!livePosition) {
      setEngineOutError('GPS is off — turn on live tracking first.')
      return
    }
    if (aircraft.glideRatio === undefined || aircraft.bestGlideSpeedKt === undefined) {
      setEngineOutError(`No glide data for ${aircraft.displayName}.`)
      return
    }
    setEngineOutError(null)
    setEngineOutActive(true)
  }

  function updateWaypoint(id: string, patch: Partial<Waypoint>) {
    setWaypoints((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)))
  }

  // Undo, scoped to the "structural" route edits (add/remove/insert/move/
  // clear/apply-a-strip) rather than every keystroke of a plain
  // updateWaypoint call — renaming a waypoint by typing already has the
  // browser's own text-field undo, and snapshotting on every keystroke
  // would make one Undo press here only revert the last character typed.
  const [waypointHistory, setWaypointHistory] = useState<Waypoint[][]>([])
  const MAX_UNDO_STEPS = 20
  function pushWaypointHistory() {
    setWaypointHistory((h) => [...h.slice(-(MAX_UNDO_STEPS - 1)), waypoints])
  }
  function undoWaypoints() {
    if (waypointHistory.length === 0) return
    const prev = waypointHistory[waypointHistory.length - 1]
    setWaypointHistory((h) => h.slice(0, -1))
    setWaypoints(prev)
  }

  function applyStrip(id: string, strip: AirstripEntry) {
    pushWaypointHistory()
    updateWaypoint(id, {
      name: strip.icao ? `${strip.name} (${strip.icao})` : strip.name,
      lat: strip.lat,
      lon: strip.lon,
      elevationFt: strip.elevationFt,
      runway: strip.runway,
      pprContact: strip.pprContact,
      country: strip.country,
      icao: strip.icao,
      customsCleared: strip.customsCleared,
      frequencies: strip.frequencies
    })
  }

  // Inserts just before the current last waypoint rather than appending
  // after it, so this stays consistent with the map's long-press "Add
  // waypoint here" — the destination stays pinned as the last waypoint
  // instead of being pushed down by each new blank one.
  function addWaypoint() {
    pushWaypointHistory()
    setWaypoints((prev) => {
      if (prev.length < 2) return [...prev, makeWaypoint()]
      const next = [...prev]
      next.splice(next.length - 1, 0, makeWaypoint())
      return next
    })
  }

  function removeWaypoint(id: string) {
    pushWaypointHistory()
    setWaypoints((prev) => (prev.length > 2 ? prev.filter((w) => w.id !== id) : prev))
  }

  // Resets back to a fresh two-blank-waypoint route — the remove button
  // above refuses to go below 2 waypoints (nav log/fuel calc need at least
  // a departure and destination), which left no way to actually clear a
  // route down to empty once you were down to your last two real points;
  // their markers stayed on the map with no way to remove them.
  function clearWaypoints() {
    if (!confirm('Clear all waypoints?')) return
    pushWaypointHistory()
    setWaypoints([makeWaypoint(), makeWaypoint()])
  }

  // Called when a midpoint handle on the map is dragged and dropped: inserts
  // a fresh waypoint right after the leg's starting waypoint, at the dropped
  // position. Everything downstream (nav log, fuel burn, totals) recomputes
  // automatically since it's all derived from the waypoints array.
  function insertWaypoint(afterIndex: number, lat: number, lon: number) {
    pushWaypointHistory()
    setWaypoints((prev) => {
      const next = [...prev]
      const wp = makeWaypoint()
      next.splice(afterIndex + 1, 0, { ...wp, lat, lon })
      return next
    })
  }

  // Same insertion positions as insertWaypoint above, but carrying the
  // full curated-strip data (name, ICAO, runway, elevation, frequencies,
  // PPR contact) rather than bare coordinates — used when a waypoint is
  // added by tapping a known airfield on the map, so it comes in fully
  // populated exactly like picking one from the strip-search dropdown does.
  function insertStripWaypoint(afterIndex: number, strip: AirstripEntry) {
    pushWaypointHistory()
    setWaypoints((prev) => {
      const next = [...prev]
      next.splice(afterIndex + 1, 0, makeWaypoint(strip))
      return next
    })
  }

  function moveWaypoint(id: string, lat: number, lon: number) {
    pushWaypointHistory()
    updateWaypoint(id, { lat, lon })
  }

  function selectWaypoint(id: string) {
    document.getElementById(`wp-name-${id}`)?.focus()
  }

  return (
    <div className={isMapFullscreen ? 'app map-is-fullscreen' : 'app'}>
      <header className="app-header">
        <div className="brand">
          LSA <span>Planner</span>
        </div>
        <div className="header-controls">
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title="Toggle light/dark theme"
            aria-label="Toggle light/dark theme"
          >
            {theme === 'dark' ? '☀' : '☽'}
          </button>
          <select
            className="unit-select"
            value={speedUnit}
            onChange={(e) => setSpeedUnit(e.target.value as SpeedUnit)}
            aria-label="Speed unit"
          >
            {SPEED_UNIT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            className="aircraft-select"
            value={aircraftId}
            onChange={(e) => setAircraftId(e.target.value)}
          >
            <optgroup label="Airplanes">
              {aircraftRegistry
                .filter((a) => a.category === 'airplane')
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.displayName}
                  </option>
                ))}
            </optgroup>
            <optgroup label="Helicopters">
              {aircraftRegistry
                .filter((a) => a.category === 'helicopter')
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.displayName}
                  </option>
                ))}
            </optgroup>
          </select>
        </div>
      </header>

      <div className="section-nav">
        <SectionMenu groups={SECTION_GROUPS} openSections={openSections} onToggle={toggleSection} />
      </div>

      {(liveStatus || timerStatus) && (
        <div className="bg-status-strip">
          {liveStatus && (
            <button
              type="button"
              className="bg-status-chip"
              onClick={() => ensureSectionOpen('live')}
            >
              &#128205; {liveStatus}
            </button>
          )}
          {timerStatus && (
            <button
              type="button"
              className="bg-status-chip"
              onClick={() => ensureSectionOpen('timer')}
            >
              &#9201; {timerStatus}
            </button>
          )}
        </div>
      )}

      <section className="panel" style={{ display: openSections.has('aircraft') ? undefined : 'none' }}>
        <p className="panel-label">Aircraft</p>
        <div className="aircraft-type-tabs">
          {(['airplane', 'helicopter'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              className={aircraftCategoryTab === cat ? 'aircraft-type-tab active' : 'aircraft-type-tab'}
              onClick={() => setAircraftCategoryTab(cat)}
            >
              {cat === 'airplane' ? 'Airplanes' : 'Helicopters'}
            </button>
          ))}
        </div>
        <div className="aircraft-picker-list">
          {aircraftRegistry.filter((a) => a.category === aircraftCategoryTab).map((a) => (
            <button
              key={a.id}
              type="button"
              className={a.id === aircraftId ? 'aircraft-picker-btn active' : 'aircraft-picker-btn'}
              onClick={() => setAircraftId(a.id)}
            >
              {a.displayName}
            </button>
          ))}
          {aircraftRegistry.filter((a) => a.category === aircraftCategoryTab).length === 0 && (
            <p className="empty-hint">
              No {aircraftCategoryTab === 'airplane' ? 'airplanes' : 'helicopters'} registered yet.
            </p>
          )}
        </div>
        <div className="aircraft-summary">
          <span>
            Default cruise{' '}
            <strong>
              {ktToUnit(aircraft.cruiseTasKt, speedUnit).toFixed(0)} {speedUnitLabel[speedUnit]}
            </strong>
          </span>
          <span>
            Burn{' '}
            <strong>
              {lphToFuelBurnUnit(
                fuelBurnLph,
                aircraft.fuelType === 'jetA' ? fuelBurnUnit : 'lph',
                FUEL_DENSITY_KG_PER_L[aircraft.fuelType]
              ).toFixed(1)}{' '}
              {fuelBurnUnitLabel[aircraft.fuelType === 'jetA' ? fuelBurnUnit : 'lph']}
            </strong>
            {aircraft.fuelType === 'jetA' && (
              <select
                className="fuel-burn-unit-select"
                value={fuelBurnUnit}
                onChange={(e) => setFuelBurnUnit(e.target.value as FuelBurnUnit)}
                aria-label="Fuel burn unit"
              >
                <option value="lph">L/h</option>
                <option value="kgph">kg/h</option>
              </select>
            )}
          </span>
          <span>
            Usable fuel <strong>{usableFuelL.toFixed(0)} L</strong>
          </span>
          <span>
            Reserve <strong>{navLog.reserveMinutes} min</strong>
          </span>
        </div>
        {aircraft.notes && <p className="footnote">{aircraft.notes}</p>}
      </section>

      <section className="panel" style={{ display: openSections.has('cruise') ? undefined : 'none' }}>
        <p className="panel-label">Cruise settings</p>
        <div className="wind-row">
          <div className="field">
            <label htmlFor="cruise-speed">Cruise speed ({speedUnitLabel[speedUnit]})</label>
            <NumberStepper
              id="cruise-speed"
              min={0}
              step={1}
              ariaLabel="cruise speed"
              value={Math.round(ktToUnit(cruiseSpeedKt, speedUnit))}
              onChange={(v) => setCruiseSpeedKt(unitToKt(v, speedUnit))}
            />
          </div>
          <div className="field">
            <label htmlFor="cruise-alt">Cruise altitude (ft)</label>
            <NumberStepper
              id="cruise-alt"
              min={0}
              step={100}
              ariaLabel="cruise altitude"
              value={cruiseAltitudeFt}
              onChange={setCruiseAltitudeFt}
            />
          </div>
        </div>
      </section>

      <section className="panel" style={{ display: openSections.has('wind') ? undefined : 'none' }}>
        <p className="panel-label">Wind (aloft, true)</p>
        <div className="wind-row">
          <div className="field">
            <label htmlFor="wind-dir">Direction &deg;T (from)</label>
            <input
              id="wind-dir"
              type="number"
              inputMode="numeric"
              min={0}
              max={360}
              value={wind.directionTrueDeg}
              onChange={(e) =>
                setWind((w) => ({ ...w, directionTrueDeg: Number(e.target.value) || 0 }))
              }
            />
          </div>
          <div className="field">
            <div className="field-label-row">
              <label htmlFor="wind-spd">Speed</label>
              <select
                className="inline-unit-select"
                value={windSpeedUnit}
                onChange={(e) => setWindSpeedUnit(e.target.value as SpeedUnit)}
                aria-label="Wind speed unit"
              >
                {SPEED_UNIT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {speedUnitLabel[o.value]}
                  </option>
                ))}
              </select>
            </div>
            <NumberStepper
              id="wind-spd"
              min={0}
              step={1}
              ariaLabel="wind speed"
              value={Math.round(ktToUnit(wind.speedKt, windSpeedUnit))}
              onChange={(v) => setWind((w) => ({ ...w, speedKt: unitToKt(v, windSpeedUnit) }))}
            />
          </div>
        </div>
        <WeatherFetch waypoints={waypoints} altitudeFt={cruiseAltitudeFt} onFetched={setWind} />
      </section>

      <section className="panel" style={{ display: openSections.has('glide') ? undefined : 'none' }}>
        <p className="panel-label">Glide range (engine-out)</p>
        {glide ? (
          <>
            <GlideSummary glide={glide} altitudeFt={cruiseAltitudeFt} />
            {livePosition && (
              <p className="empty-hint">
                {liveAglFt !== undefined
                  ? `Live circle uses ${Math.round(liveAglFt)} ft above ground (terrain-corrected).`
                  : 'Live circle uses raw GPS altitude — terrain lookup unavailable, so this may overstate range over high ground.'}
              </p>
            )}
          </>
        ) : (
          <p className="empty-hint">
            No published glide-ratio figure for {aircraft.displayName} — a fixed-wing L/D glide
            circle wouldn't represent {aircraft.category === 'helicopter' ? 'autorotation' : 'this aircraft’s'} performance, so it's not shown rather than guessed at.
          </p>
        )}
      </section>

      <section
        className="panel"
        style={{ display: openSections.has('route') || isMapFullscreen ? undefined : 'none' }}
      >
        <p className="panel-label">Route</p>
        <RouteMap
          waypoints={waypoints}
          onMoveWaypoint={moveWaypoint}
          onInsertWaypoint={insertWaypoint}
          onInsertStrip={insertStripWaypoint}
          onSelectWaypoint={selectWaypoint}
          glide={glide}
          liveGlide={liveGlide}
          livePosition={livePosition}
          fuelBurnLph={fuelBurnLph}
          cruiseSpeedKt={cruiseSpeedKt}
          visible={openSections.has('route') || isMapFullscreen}
          pattern={trafficPattern}
          fullscreen={isMapFullscreen}
          onToggleFullscreen={() => setIsMapFullscreen((f) => !f)}
          historyTrack={selectedHistoryTrack?.points ?? null}
          engineOutActive={engineOutActive}
          engineOutTarget={engineOutTarget}
          engineOutSites={engineOutSites}
          engineOutLoading={engineOutLoading}
          engineOutError={engineOutError}
          onToggleEngineOut={handleToggleEngineOut}
          userId={userId}
          userEmail={session?.user.email ?? null}
          canUndoWaypoint={waypointHistory.length > 0}
          onUndoWaypoint={undoWaypoints}
        />
        <div className="pattern-controls">
          <p className="panel-sublabel">Landing pattern overlay</p>
          <div className="waypoint-fields fp-grid">
            <div className="field">
              <label htmlFor="pattern-strip">Airfield</label>
              <select
                id="pattern-strip"
                value={patternStripId}
                onChange={(e) => setPatternStripId(e.target.value)}
              >
                <option value="">None</option>
                {patternCapableStrips.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            {selectedPatternStrip?.runway && (
              <div className="field">
                <label htmlFor="pattern-runway">Landing runway</label>
                <select
                  id="pattern-runway"
                  value={patternRunwayEnd}
                  onChange={(e) => setPatternRunwayEnd(e.target.value as 'A' | 'B')}
                >
                  <option value="A">{selectedPatternStrip.runway.split('/')[0]}</option>
                  <option value="B">{selectedPatternStrip.runway.split('/')[1]}</option>
                </select>
              </div>
            )}
            <div className="field">
              <label htmlFor="pattern-side">Traffic pattern</label>
              <select
                id="pattern-side"
                value={patternTrafficSide}
                onChange={(e) => setPatternTrafficSide(e.target.value as 'left' | 'right')}
              >
                <option value="left">Left-hand (assumed default)</option>
                <option value="right">Right-hand</option>
              </select>
            </div>
          </div>
          {patternStripId && (
            <div className="waypoint-fields fp-grid">
              <div className="field">
                <label htmlFor="pattern-downwind">Downwind offset (m)</label>
                <input
                  id="pattern-downwind"
                  type="number"
                  min={100}
                  step={50}
                  value={patternDownwindM}
                  onChange={(e) => setPatternDownwindM(Number(e.target.value) || 1000)}
                />
              </div>
              <div className="field">
                <label htmlFor="pattern-magvar">Magnetic variation (&deg;E, approx.)</label>
                <input
                  id="pattern-magvar"
                  type="number"
                  step={1}
                  value={patternMagVarDeg}
                  onChange={(e) => setPatternMagVarDeg(Number(e.target.value) || 0)}
                />
              </div>
            </div>
          )}
        </div>
        <div className="waypoint-list">
          {waypoints.map((wp, i) => {
            const isStart = i === 0
            const isDestination = i === waypoints.length - 1 && waypoints.length > 1
            const role = isStart ? 'start' : isDestination ? 'destination' : 'middle'
            return (
            <div className="waypoint-row" key={wp.id}>
              <span className={`waypoint-dot waypoint-dot-${role}`} />
              <div className="waypoint-body">
                {(isStart || isDestination) && (
                  <span className={`waypoint-role-badge waypoint-role-badge-${role}`}>
                    {isStart ? 'Start' : 'Destination'}
                  </span>
                )}
                <StripSearch onSelect={(strip) => applyStrip(wp.id, strip)} />
                <div className="waypoint-fields">
                  <input
                    id={`wp-name-${wp.id}`}
                    className="name"
                    placeholder={isStart ? 'Start name' : isDestination ? 'Destination name' : `WP${i + 1} name`}
                    value={wp.name}
                    onChange={(e) => updateWaypoint(wp.id, { name: e.target.value })}
                  />
                  <input
                    placeholder="Lat (dd)"
                    inputMode="decimal"
                    value={wp.lat || ''}
                    onChange={(e) =>
                      updateWaypoint(wp.id, { lat: Number(e.target.value) || 0 })
                    }
                  />
                  <input
                    placeholder="Lon (dd)"
                    inputMode="decimal"
                    value={wp.lon || ''}
                    onChange={(e) =>
                      updateWaypoint(wp.id, { lon: Number(e.target.value) || 0 })
                    }
                  />
                </div>
                {wp.pprContact && (
                  <p className="ppr-note">
                    PPR required &mdash; call {wp.pprContact.name}, tel. {wp.pprContact.phone}
                  </p>
                )}
              </div>
              <button
                className="remove-btn"
                onClick={() => removeWaypoint(wp.id)}
                aria-label={`Remove waypoint ${i + 1}`}
                title={waypoints.length <= 2 ? 'At least 2 waypoints are required' : undefined}
                disabled={waypoints.length <= 2}
              >
                &times;
              </button>
            </div>
            )
          })}
        </div>
        <div className="waypoint-list-actions">
          <button className="add-waypoint" onClick={addWaypoint}>
            + Add waypoint
          </button>
          <button
            className="undo-waypoints-btn"
            onClick={undoWaypoints}
            disabled={waypointHistory.length === 0}
            title="Undo the last route edit"
          >
            &#8630; Undo
          </button>
          <button className="clear-waypoints-btn" onClick={clearWaypoints}>
            Clear all waypoints
          </button>
        </div>
      </section>

      <section className="panel" style={{ display: openSections.has('live') ? undefined : 'none' }}>
        <p className="panel-label">Live tracking</p>
        <LiveTracking
          waypoints={waypoints}
          fallbackGroundSpeedKt={
            navLog.legs.length > 0
              ? navLog.legs.reduce((s, l) => s + l.groundSpeedKt, 0) / navLog.legs.length
              : aircraft.cruiseTasKt
          }
          speedUnit={speedUnit}
          tracking={gps.tracking}
          position={gps.position}
          error={gps.error}
          start={gps.start}
          stop={gps.stop}
          wakeLockSupported={wakeLock.supported}
          wakeLockHeld={wakeLock.held}
        />
      </section>

      <section className="panel" style={{ display: openSections.has('bearing') ? undefined : 'none' }}>
        <p className="panel-label">Bearing &amp; track</p>
        <Bearing
          waypoints={waypoints}
          livePosition={livePosition}
          engineOutTarget={engineOutTarget}
          gpsTracking={gps.tracking}
          onStartGps={gps.start}
        />
      </section>

      <section className="panel" style={{ display: openSections.has('history') ? undefined : 'none' }}>
        <p className="panel-label">Flight history</p>
        <FlightHistory
          userId={userId}
          refreshKey={historyRefreshKey}
          selectedTrackId={selectedHistoryTrack?.id ?? null}
          onSelect={setSelectedHistoryTrack}
        />
      </section>

      <section className="panel" style={{ display: openSections.has('weatherreport') ? undefined : 'none' }}>
        <p className="panel-label">Weather report</p>
        <WeatherReport waypoints={waypoints} />
      </section>

      <section className="panel" style={{ display: openSections.has('metartaf') ? undefined : 'none' }}>
        <p className="panel-label">METAR / TAF</p>
        <MetarTaf waypoints={waypoints} />
      </section>

      <section className="panel" style={{ display: openSections.has('frequencies') ? undefined : 'none' }}>
        <p className="panel-label">Radio frequencies</p>
        <RadioFrequencies waypoints={waypoints} livePosition={livePosition} />
      </section>

      <section className="panel" style={{ display: openSections.has('fuel') ? undefined : 'none' }}>
        <p className="panel-label">Fuel</p>
        <div className="fuel-config-row">
          {aircraft.extendedFuelCapacityL !== undefined && (
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={extendedTanks}
                onChange={(e) => setExtendedTanks(e.target.checked)}
              />
              Extended tanks fitted ({aircraft.extendedFuelCapacityL} L capacity)
            </label>
          )}
          <div className="field">
            <div className="field-label-row">
              <label htmlFor="fuel-onboard">
                Fuel onboard at takeoff ({showFuelInKg ? 'kg' : 'L'})
              </label>
              <button
                type="button"
                className="fill-btn"
                onClick={() => setFuelOnBoardL(usableFuelL)}
              >
                Fill to {(usableFuelL * fuelDisplayFactor).toFixed(0)} {showFuelInKg ? 'kg' : 'L'}
              </button>
            </div>
            <NumberStepper
              id="fuel-onboard"
              min={0}
              max={Math.round(usableFuelL * fuelDisplayFactor)}
              step={showFuelInKg ? 5 : 1}
              ariaLabel="fuel onboard"
              value={Math.round(fuelOnBoardL * fuelDisplayFactor)}
              onChange={(v) => setFuelOnBoardL(v / fuelDisplayFactor)}
            />
          </div>
          <div className="field">
            <div className="field-label-row">
              <label htmlFor="fuel-burn-rate">
                Fuel burn rate ({showFuelInKg ? 'kg/h' : 'L/h'})
              </label>
              {fuelBurnLph !== aircraft.fuelBurnLph && (
                <button
                  type="button"
                  className="fill-btn"
                  onClick={() => setFuelBurnLph(aircraft.fuelBurnLph)}
                >
                  Reset to published{' '}
                  {(aircraft.fuelBurnLph * fuelDisplayFactor).toFixed(1)} {showFuelInKg ? 'kg/h' : 'L/h'}
                </button>
              )}
            </div>
            <NumberStepper
              id="fuel-burn-rate"
              min={0}
              step={showFuelInKg ? 1 : 0.5}
              decimals={1}
              ariaLabel="fuel burn rate"
              value={fuelBurnLph * fuelDisplayFactor}
              onChange={(v) => setFuelBurnLph(v / fuelDisplayFactor)}
            />
          </div>
          <div className="field">
            <label htmlFor="reserve-min">Reserve (min, min. {MIN_RESERVE_MINUTES})</label>
            <NumberStepper
              id="reserve-min"
              min={MIN_RESERVE_MINUTES}
              step={5}
              ariaLabel="reserve minutes"
              value={reserveMinutes}
              onChange={(v) => setReserveMinutes(Math.max(MIN_RESERVE_MINUTES, v))}
            />
          </div>
        </div>
        <FuelGauge navLog={navLog} unit={showFuelInKg ? 'kg' : 'L'} densityKgPerL={fuelDisplayFactor} />
      </section>

      <section className="panel" style={{ display: openSections.has('weight') ? undefined : 'none' }}>
        <p className="panel-label">Payload &amp; weight</p>
        <div className="wind-row">
          <div className="field mtow-field">
            <label htmlFor="mtow-select">MTOW category</label>
            <select
              id="mtow-select"
              value={mtowKg}
              onChange={(e) => setMtowKg(Number(e.target.value))}
            >
              {(aircraft.mtowCategoriesKg ?? [{ weightKg: aircraft.maxTakeoffWeightKg }]).map((opt) => (
                <option key={opt.weightKg} value={opt.weightKg}>
                  {opt.label ?? `${opt.weightKg} kg`}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="empty-weight-kg">Empty weight (kg)</label>
            <NumberStepper
              id="empty-weight-kg"
              min={0}
              step={1}
              ariaLabel="empty weight"
              value={emptyWeightKg}
              onChange={setEmptyWeightKg}
            />
          </div>
        </div>
        <div className="wind-row">
          <div className="field">
            <label htmlFor="pilot-kg">Pilot (kg)</label>
            <NumberStepper
              id="pilot-kg"
              min={0}
              step={1}
              ariaLabel="pilot weight"
              value={pilotKg}
              onChange={setPilotKg}
            />
          </div>
          <div className="field">
            <label htmlFor="passenger-kg">Passenger (kg)</label>
            <NumberStepper
              id="passenger-kg"
              min={0}
              step={1}
              ariaLabel="passenger weight"
              value={passengerKg}
              onChange={setPassengerKg}
            />
          </div>
          <div className="field">
            <label htmlFor="luggage-kg">Luggage (kg)</label>
            <NumberStepper
              id="luggage-kg"
              min={0}
              step={1}
              ariaLabel="luggage weight"
              value={luggageKg}
              onChange={setLuggageKg}
            />
          </div>
        </div>
        <div className="weight-summary-wrap">
          <WeightSummary weight={weight} />
        </div>
      </section>

      <section className="panel" style={{ display: openSections.has('navlog') ? undefined : 'none' }}>
        <p className="panel-label">Nav log</p>
        <NavLogView navLog={navLog} speedUnit={speedUnit} />
      </section>

      <section className="panel" style={{ display: openSections.has('totals') ? undefined : 'none' }}>
        <p className="panel-label">Totals</p>
        {navLog.legs.length === 0 ? (
          <p className="empty-hint">Add a route with at least two waypoints to see totals.</p>
        ) : (
          <div className="totals-grid">
            <div>
              <div className="stat-label">Total distance</div>
              <div className="stat-value">{navLog.totalDistanceNm.toFixed(1)} nm</div>
            </div>
            <div>
              <div className="stat-label">Total time</div>
              <div className="stat-value">{formatMinutes(navLog.totalTimeMinutes)}</div>
            </div>
            <div>
              <div className="stat-label">Fuel onboard at takeoff</div>
              <div className="stat-value">{navLog.fuelOnBoardL.toFixed(1)} L</div>
            </div>
            <div>
              <div className="stat-label">Fuel remaining at landing</div>
              <div className="stat-value">{navLog.fuelRemainingAtLandingL.toFixed(1)} L</div>
            </div>
            <div>
              <div className="stat-label">Reserve fuel</div>
              <div className="stat-value">{navLog.reserveFuelL.toFixed(1)} L</div>
            </div>
            <div>
              <div className="stat-label">Planned altitude</div>
              <div className="stat-value">{cruiseAltitudeFt.toLocaleString()} ft</div>
            </div>
            <div>
              <div className="stat-label">Endurance on remaining fuel</div>
              <div className="stat-value">
                {navLog.fuelRemainingAtLandingL >= 0 ? '' : '-'}
                {formatMinutes(
                  Math.abs((navLog.fuelRemainingAtLandingL / fuelBurnLph) * 60)
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="panel" style={{ display: openSections.has('daylight') ? undefined : 'none' }}>
        <p className="panel-label">Daylight</p>
        <DaylightInfo waypoints={waypoints} />
      </section>

      <section className="panel" style={{ display: openSections.has('checklist') ? undefined : 'none' }}>
        <p className="panel-label">Checklist</p>
        <Checklist />
      </section>

      <section className="panel" style={{ display: openSections.has('flightplan') ? undefined : 'none' }}>
        <p className="panel-label">Flight plan (Norway VFR)</p>
        <FlightPlanTool
          waypoints={waypoints}
          aircraft={effectiveAircraft}
          navLog={navLog}
          cruiseAltitudeFt={cruiseAltitudeFt}
          defaultPob={1 + (passengerKg > 0 ? 1 : 0)}
        />
      </section>

      <section className="panel" style={{ display: openSections.has('savedplans') ? undefined : 'none' }}>
        <p className="panel-label">Saved plans</p>
        <SavedPlans userId={userId} getCurrentPlan={buildCurrentPlan} onLoad={applyPersistedPlan} />
      </section>

      <section className="panel" style={{ display: openSections.has('timer') ? undefined : 'none' }}>
        <p className="panel-label">Flight timer (logbook)</p>
        <FlightTimer
          sessions={timer.sessions}
          session={timer.session}
          leg={timer.leg}
          actions={timer.actions}
          summary={timer.summary}
          startEngine={timer.startEngine}
          takeoff={timer.takeoff}
          landing={handleLanding}
          shutdownEngine={timer.shutdownEngine}
          reset={timer.reset}
        />
      </section>

      <section className="panel" style={{ display: openSections.has('help') ? undefined : 'none' }}>
        <p className="panel-label">Help &amp; disclaimers</p>
        <Help />
      </section>

      {isMapFullscreen && (
        <TimerActionBar
          actions={timer.actions}
          startEngine={timer.startEngine}
          takeoff={timer.takeoff}
          landing={handleLanding}
          shutdownEngine={timer.shutdownEngine}
          onExitFullscreen={() => setIsMapFullscreen(false)}
          gpsTracking={gps.tracking}
          onToggleGps={gps.tracking ? gps.stop : gps.start}
        />
      )}
    </div>
  )
}
