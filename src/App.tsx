import { useEffect, useMemo, useState } from 'react'
import { aircraftRegistry, getAircraftById } from './aircraft/registry'
import { formatMinutes, planRoute, MIN_RESERVE_MINUTES, type Waypoint } from './lib/planning'
import type { Wind } from './lib/wind'
import FuelGauge from './components/FuelGauge'
import NavLogView from './components/NavLog'
import StripSearch from './components/StripSearch'
import WeightSummary from './components/WeightSummary'
import RouteMap from './components/RouteMap'
import { airstrips, type AirstripEntry } from './data/strips'
import { ktToUnit, unitToKt, speedUnitLabel, type SpeedUnit } from './lib/units'
import { computeWeight } from './lib/weight'
import { computeGlide } from './lib/glide'
import GlideSummary from './components/GlideSummary'
import WeatherFetch from './components/WeatherFetch'
import DaylightInfo from './components/DaylightInfo'
import FlightPlanTool from './components/FlightPlanTool'
import FlightTimer from './components/FlightTimer'
import TimerActionBar from './components/TimerActionBar'
import { useFlightTimer } from './hooks/useFlightTimer'
import { useGpsTracking } from './hooks/useGpsTracking'
import LiveTracking from './components/LiveTracking'
import type { LivePosition } from './lib/liveTracking'
import SectionMenu from './components/SectionMenu'
import WeatherReport from './components/WeatherReport'
import RadioFrequencies from './components/RadioFrequencies'
import { computeTrafficPattern, parseRunwayEnds } from './lib/trafficPattern'
import { loadPersistedPlan, savePersistedPlan } from './lib/persistence'

let nextId = 1
function makeWaypoint(strip?: AirstripEntry): Waypoint {
  return {
    id: `wp-${nextId++}`,
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

const MTOW_OPTIONS_KG = [450, 560, 600]

const SECTION_GROUPS: { label: string; sections: { id: string; label: string }[] }[] = [
  {
    label: 'Setup',
    sections: [
      { id: 'aircraft', label: 'Aircraft' },
      { id: 'cruise', label: 'Cruise settings' },
      { id: 'wind', label: 'Wind' },
      { id: 'fuel', label: 'Fuel' },
      { id: 'weight', label: 'Payload & weight' }
    ]
  },
  {
    label: 'Route & safety',
    sections: [
      { id: 'route', label: 'Route & map' },
      { id: 'glide', label: 'Glide range' },
      { id: 'live', label: 'Live tracking' },
      { id: 'weatherreport', label: 'Weather report' },
      { id: 'frequencies', label: 'Radio frequencies' }
    ]
  },
  {
    label: 'Results',
    sections: [
      { id: 'navlog', label: 'Nav log' },
      { id: 'totals', label: 'Totals' },
      { id: 'daylight', label: 'Daylight' }
    ]
  },
  {
    label: 'Documents',
    sections: [
      { id: 'flightplan', label: 'Flight plan' },
      { id: 'timer', label: 'Flight timer (logbook)' }
    ]
  }
]

export default function App() {
  const persisted = loadPersistedPlan()

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

  // Keep the plan safe across refreshes — deliberately excludes transient
  // things like GPS position, timer sessions, and which panels are open.
  useEffect(() => {
    savePersistedPlan({
      aircraftId,
      waypoints,
      wind,
      cruiseSpeedKt,
      cruiseAltitudeFt,
      speedUnit,
      windSpeedUnit,
      extendedTanks,
      fuelOnBoardL,
      reserveMinutes,
      pilotKg,
      passengerKg,
      luggageKg,
      mtowKg
    })
  }, [
    aircraftId,
    waypoints,
    wind,
    cruiseSpeedKt,
    cruiseAltitudeFt,
    speedUnit,
    windSpeedUnit,
    extendedTanks,
    fuelOnBoardL,
    reserveMinutes,
    pilotKg,
    passengerKg,
    luggageKg,
    mtowKg
  ])

  const [livePosition, setLivePosition] = useState<LivePosition | null>(null)
  const [liveStatus, setLiveStatus] = useState<string | null>(null)
  const [timerStatus, setTimerStatus] = useState<string | null>(null)
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['aircraft']))
  const [isMapFullscreen, setIsMapFullscreen] = useState(false)

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aircraftId])

  useEffect(() => {
    setFuelOnBoardL(usableFuelL)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usableFuelL])

  const validWaypoints = useMemo(
    () => waypoints.filter((w) => Number.isFinite(w.lat) && Number.isFinite(w.lon)),
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
        reserveMinutes
      ),
    [validWaypoints, aircraft, wind, cruiseSpeedKt, usableFuelL, fuelOnBoardL, reserveMinutes]
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
        aircraft.emptyWeightKg,
        fuelOnBoardL,
        pilotKg,
        passengerKg,
        luggageKg,
        mtowKg
      ),
    [aircraft.emptyWeightKg, fuelOnBoardL, pilotKg, passengerKg, luggageKg, mtowKg]
  )

  const glide = useMemo(
    () => computeGlide(cruiseAltitudeFt, aircraft.glideRatio, aircraft.bestGlideSpeedKt, wind),
    [cruiseAltitudeFt, aircraft.glideRatio, aircraft.bestGlideSpeedKt, wind]
  )

  function updateWaypoint(id: string, patch: Partial<Waypoint>) {
    setWaypoints((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)))
  }

  function applyStrip(id: string, strip: AirstripEntry) {
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

  function addWaypoint() {
    setWaypoints((prev) => [...prev, makeWaypoint()])
  }

  function removeWaypoint(id: string) {
    setWaypoints((prev) => (prev.length > 2 ? prev.filter((w) => w.id !== id) : prev))
  }

  // Called when a midpoint handle on the map is dragged and dropped: inserts
  // a fresh waypoint right after the leg's starting waypoint, at the dropped
  // position. Everything downstream (nav log, fuel burn, totals) recomputes
  // automatically since it's all derived from the waypoints array.
  function insertWaypoint(afterIndex: number, lat: number, lon: number) {
    setWaypoints((prev) => {
      const next = [...prev]
      const wp = makeWaypoint()
      next.splice(afterIndex + 1, 0, { ...wp, lat, lon })
      return next
    })
  }

  function moveWaypoint(id: string, lat: number, lon: number) {
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
            {aircraftRegistry.map((a) => (
              <option key={a.id} value={a.id}>
                {a.displayName}
              </option>
            ))}
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
        <div className="aircraft-summary">
          <span>
            Default cruise{' '}
            <strong>
              {ktToUnit(aircraft.cruiseTasKt, speedUnit).toFixed(0)} {speedUnitLabel[speedUnit]}
            </strong>
          </span>
          <span>
            Burn <strong>{aircraft.fuelBurnLph} L/h</strong>
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
            <input
              id="cruise-speed"
              type="number"
              inputMode="numeric"
              min={0}
              value={Math.round(ktToUnit(cruiseSpeedKt, speedUnit))}
              onChange={(e) =>
                setCruiseSpeedKt(unitToKt(Number(e.target.value) || 0, speedUnit))
              }
            />
          </div>
          <div className="field">
            <label htmlFor="cruise-alt">Cruise altitude (ft)</label>
            <input
              id="cruise-alt"
              type="number"
              inputMode="numeric"
              min={0}
              step={100}
              value={cruiseAltitudeFt}
              onChange={(e) => setCruiseAltitudeFt(Number(e.target.value) || 0)}
            />
          </div>
        </div>
        <p className="footnote">
          Defaults to {aircraft.displayName}'s published cruise speed &mdash; lower it for a
          fuel-saving cruise or a short-field configuration. Altitude is recorded for your nav
          log but doesn't yet adjust true airspeed or fuel burn for density altitude.
        </p>
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
            <input
              id="wind-spd"
              type="number"
              inputMode="numeric"
              min={0}
              value={Math.round(ktToUnit(wind.speedKt, windSpeedUnit))}
              onChange={(e) =>
                setWind((w) => ({
                  ...w,
                  speedKt: unitToKt(Number(e.target.value) || 0, windSpeedUnit)
                }))
              }
            />
          </div>
        </div>
        <p className="footnote">
          Wind speed has its own unit, separate from the header setting above &mdash; handy
          since METAR/TAF wind is often reported in different units than you fly.
        </p>
        <WeatherFetch waypoints={waypoints} altitudeFt={cruiseAltitudeFt} onFetched={setWind} />
      </section>

      <section className="panel" style={{ display: openSections.has('glide') ? undefined : 'none' }}>
        <p className="panel-label">Glide range (engine-out)</p>
        <GlideSummary glide={glide} aircraft={aircraft} altitudeFt={cruiseAltitudeFt} />
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
          onSelectWaypoint={selectWaypoint}
          glide={glide}
          livePosition={livePosition}
          visible={openSections.has('route') || isMapFullscreen}
          pattern={trafficPattern}
          fullscreen={isMapFullscreen}
          onToggleFullscreen={() => setIsMapFullscreen((f) => !f)}
        />
        <p className="footnote">
          Drag a waypoint marker to reposition it, or drag one of the small handles along the
          route line to insert a new waypoint there &mdash; the nav log and fuel numbers below
          update automatically. The dashed amber circles show engine-out glide range from each
          waypoint at your planned cruise altitude &mdash; see the Glide range panel below. Use
          the layers icon (top-right of the map) to switch to Kartverket's detailed Norway
          topographic tiles &mdash; free, official, but Norway-only; OpenStreetMap covers Sweden
          too. Small grey diamonds show every curated strip, not just your route. The screen icon
          (top-left) opens a fullscreen map with flight-timer buttons below it, handy for
          practicing patterns.
        </p>

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
          <p className="footnote">
            The downwind offset and the base-turn point (where the threshold sits 45&deg; behind
            the wing) are exact geometry for whatever distance you enter. Traffic side (left/right)
            defaults to left since that's the global convention, but I don't actually know each
            field's published pattern direction &mdash; verify locally. Magnetic variation is an
            approximate figure you can adjust, not looked up live. This is a visual training
            reference, not a substitute for the field's actual published procedures.
          </p>
        </div>
        <div className="waypoint-list">
          {waypoints.map((wp, i) => (
            <div className="waypoint-row" key={wp.id}>
              <span className="waypoint-dot" />
              <div className="waypoint-body">
                <StripSearch onSelect={(strip) => applyStrip(wp.id, strip)} />
                <div className="waypoint-fields">
                  <input
                    id={`wp-name-${wp.id}`}
                    className="name"
                    placeholder={`WP${i + 1} name`}
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
                disabled={waypoints.length <= 2}
              >
                &times;
              </button>
            </div>
          ))}
        </div>
        <button className="add-waypoint" onClick={addWaypoint}>
          + Add waypoint
        </button>
        <p className="footnote">
          Open the dropdown to browse a starter list of confirmed grass/gravel strips in Norway
          and Sweden (see <code>src/data/strips.ts</code>), with surface, runway, length, and
          elevation shown for each &mdash; selecting one fills the fields below, which you can
          still edit by hand. For anywhere else, type coordinates directly in decimal degrees
          (e.g. 44.8848, -93.2223); south and west are negative.
        </p>
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
        />
      </section>

      <section className="panel" style={{ display: openSections.has('weatherreport') ? undefined : 'none' }}>
        <p className="panel-label">Weather report</p>
        <WeatherReport waypoints={waypoints} />
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
              <label htmlFor="fuel-onboard">Fuel onboard at takeoff (L)</label>
              <button
                type="button"
                className="fill-btn"
                onClick={() => setFuelOnBoardL(usableFuelL)}
              >
                Fill to {usableFuelL.toFixed(0)} L
              </button>
            </div>
            <input
              id="fuel-onboard"
              type="number"
              inputMode="numeric"
              min={0}
              max={usableFuelL}
              value={Math.round(fuelOnBoardL)}
              onChange={(e) => setFuelOnBoardL(Number(e.target.value) || 0)}
            />
          </div>
          <div className="field">
            <label htmlFor="reserve-min">Reserve (min, min. {MIN_RESERVE_MINUTES})</label>
            <input
              id="reserve-min"
              type="number"
              inputMode="numeric"
              min={MIN_RESERVE_MINUTES}
              value={reserveMinutes}
              onChange={(e) =>
                setReserveMinutes(Math.max(MIN_RESERVE_MINUTES, Number(e.target.value) || 0))
              }
            />
          </div>
        </div>
        <FuelGauge navLog={navLog} />
        {aircraft.extendedFuelCapacityL !== undefined && (
          <p className="footnote">
            Extended-tank capacity is an estimate, not a confirmed factory spec &mdash; verify
            against your aircraft's documentation before relying on it.
          </p>
        )}
      </section>

      <section className="panel" style={{ display: openSections.has('weight') ? undefined : 'none' }}>
        <p className="panel-label">Payload &amp; weight</p>
        <div className="field mtow-field">
          <label htmlFor="mtow-select">MTOW category</label>
          <select
            id="mtow-select"
            value={mtowKg}
            onChange={(e) => setMtowKg(Number(e.target.value))}
          >
            {MTOW_OPTIONS_KG.map((kg) => (
              <option key={kg} value={kg}>
                {kg} kg
              </option>
            ))}
          </select>
        </div>
        <div className="wind-row">
          <div className="field">
            <label htmlFor="pilot-kg">Pilot (kg)</label>
            <input
              id="pilot-kg"
              type="number"
              inputMode="numeric"
              min={0}
              value={pilotKg}
              onChange={(e) => setPilotKg(Number(e.target.value) || 0)}
            />
          </div>
          <div className="field">
            <label htmlFor="passenger-kg">Passenger (kg)</label>
            <input
              id="passenger-kg"
              type="number"
              inputMode="numeric"
              min={0}
              value={passengerKg}
              onChange={(e) => setPassengerKg(Number(e.target.value) || 0)}
            />
          </div>
          <div className="field">
            <label htmlFor="luggage-kg">Luggage (kg)</label>
            <input
              id="luggage-kg"
              type="number"
              inputMode="numeric"
              min={0}
              value={luggageKg}
              onChange={(e) => setLuggageKg(Number(e.target.value) || 0)}
            />
          </div>
        </div>
        <div className="weight-summary-wrap">
          <WeightSummary weight={weight} />
        </div>
        <p className="footnote">
          Fuel weight uses an approximate avgas density of 0.72 kg/L. This is a takeoff-weight
          check only &mdash; it doesn't verify CG position within limits.
        </p>
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
                  Math.abs((navLog.fuelRemainingAtLandingL / aircraft.fuelBurnLph) * 60)
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

      <section className="panel" style={{ display: openSections.has('flightplan') ? undefined : 'none' }}>
        <p className="panel-label">Flight plan (Norway VFR)</p>
        <FlightPlanTool
          waypoints={waypoints}
          aircraft={aircraft}
          navLog={navLog}
          cruiseAltitudeFt={cruiseAltitudeFt}
          defaultPob={1 + (passengerKg > 0 ? 1 : 0)}
        />
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
          landing={timer.landing}
          shutdownEngine={timer.shutdownEngine}
          reset={timer.reset}
        />
      </section>

      {isMapFullscreen && (
        <TimerActionBar
          actions={timer.actions}
          startEngine={timer.startEngine}
          takeoff={timer.takeoff}
          landing={timer.landing}
          shutdownEngine={timer.shutdownEngine}
          onExitFullscreen={() => setIsMapFullscreen(false)}
          gpsTracking={gps.tracking}
          onToggleGps={gps.tracking ? gps.stop : gps.start}
        />
      )}
    </div>
  )
}
