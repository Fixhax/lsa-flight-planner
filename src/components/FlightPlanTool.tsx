import { useMemo, useState } from 'react'
import type { Waypoint, NavLog } from '../lib/planning'
import type { AircraftProfile } from '../types/aircraft'
import {
  generateFlightPlanText,
  detectBorderCrossing,
  type FlightPlanInputs
} from '../lib/flightPlan'

interface Props {
  waypoints: Waypoint[]
  aircraft: AircraftProfile
  navLog: NavLog
  cruiseAltitudeFt: number
  defaultPob: number
}

export default function FlightPlanTool({
  waypoints,
  aircraft,
  navLog,
  cruiseAltitudeFt,
  defaultPob
}: Props) {
  const [aircraftReg, setAircraftReg] = useState('')
  const [aircraftTypeIcao, setAircraftTypeIcao] = useState('')
  const [wakeCategory] = useState<'L' | 'M' | 'H'>('L')
  const [equipment, setEquipment] = useState('')
  const [transponder, setTransponder] = useState('')
  const [etdUtc, setEtdUtc] = useState('')
  const [altAerodrome, setAltAerodrome] = useState('')
  const [pob, setPob] = useState(defaultPob)
  const [pilotName, setPilotName] = useState('')
  const [aircraftColour, setAircraftColour] = useState('')
  const [eltCarried, setEltCarried] = useState(true)
  const [survivalEquipmentNote, setSurvivalEquipmentNote] = useState('')
  const [customsNotified, setCustomsNotified] = useState(false)
  const [copied, setCopied] = useState(false)

  const border = useMemo(() => detectBorderCrossing(waypoints), [waypoints])

  const inputs: FlightPlanInputs = {
    aircraftReg,
    aircraftTypeIcao,
    wakeCategory,
    equipment,
    transponder,
    etdUtc,
    altAerodrome,
    pob,
    pilotName,
    aircraftColour,
    eltCarried,
    survivalEquipmentNote,
    customsNotified
  }

  const text = useMemo(
    () =>
      navLog.legs.length > 0
        ? generateFlightPlanText(waypoints, aircraft, navLog, cruiseAltitudeFt, inputs, border)
        : '',
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [waypoints, aircraft, navLog, cruiseAltitudeFt, inputs, border]
  )

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard API can fail without permission — the text is still
      // visible and selectable, so this isn't fatal
    }
  }

  return (
    <div className="flight-plan-tool">
      <div className="waypoint-fields fp-grid">
        <div className="field">
          <label htmlFor="fp-reg">Registration</label>
          <input
            id="fp-reg"
            placeholder="e.g. LN-ABC"
            value={aircraftReg}
            onChange={(e) => setAircraftReg(e.target.value.toUpperCase())}
          />
        </div>
        <div className="field">
          <label htmlFor="fp-type">ICAO type code</label>
          <input
            id="fp-type"
            placeholder="blank if unlisted"
            value={aircraftTypeIcao}
            onChange={(e) => setAircraftTypeIcao(e.target.value.toUpperCase())}
          />
        </div>
        <div className="field">
          <label htmlFor="fp-etd">EOBT (UTC, HH:MM)</label>
          <input
            id="fp-etd"
            placeholder="e.g. 07:30Z"
            value={etdUtc}
            onChange={(e) => setEtdUtc(e.target.value)}
          />
        </div>
      </div>
      <div className="waypoint-fields fp-grid">
        <div className="field">
          <label htmlFor="fp-equip">COM/NAV equipment</label>
          <input
            id="fp-equip"
            placeholder="e.g. V or VG"
            value={equipment}
            onChange={(e) => setEquipment(e.target.value.toUpperCase())}
          />
        </div>
        <div className="field">
          <label htmlFor="fp-transponder">Surveillance (SSR)</label>
          <input
            id="fp-transponder"
            placeholder="e.g. C or N"
            value={transponder}
            onChange={(e) => setTransponder(e.target.value.toUpperCase())}
          />
        </div>
        <div className="field">
          <label htmlFor="fp-pob">Persons on board</label>
          <input
            id="fp-pob"
            type="number"
            min={1}
            value={pob}
            onChange={(e) => setPob(Number(e.target.value) || 1)}
          />
        </div>
      </div>
      <p className="footnote fp-equip-warning">
        Don't default to "S" unless you genuinely have the full standard suite (VHF RTF, VOR,
        AND ILS) &mdash; SKYbrary flags this as a common, serious mistake. Most LSAs should list
        actual equipment instead, e.g. V (VHF) and/or G (GNSS).
      </p>

      <div className="waypoint-fields fp-grid">
        <div className="field">
          <label htmlFor="fp-pilot">Pilot in command</label>
          <input id="fp-pilot" value={pilotName} onChange={(e) => setPilotName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="fp-colour">Aircraft colour</label>
          <input
            id="fp-colour"
            placeholder="e.g. white/red"
            value={aircraftColour}
            onChange={(e) => setAircraftColour(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="fp-alt">Alternate aerodrome</label>
          <input
            id="fp-alt"
            placeholder="optional"
            value={altAerodrome}
            onChange={(e) => setAltAerodrome(e.target.value)}
          />
        </div>
      </div>

      <label className="checkbox-field fp-elt-check">
        <input
          type="checkbox"
          checked={eltCarried}
          onChange={(e) => setEltCarried(e.target.checked)}
        />
        ELT (emergency locator transmitter) carried
      </label>

      <div className="field fp-alt-field">
        <label htmlFor="fp-survival">Survival equipment / dinghies / jackets (Item 19)</label>
        <input
          id="fp-survival"
          placeholder="e.g. life jackets, no dinghy"
          value={survivalEquipmentNote}
          onChange={(e) => setSurvivalEquipmentNote(e.target.value)}
        />
      </div>

      {border.crossesBorder && (
        <label className="checkbox-field fp-customs-check">
          <input
            type="checkbox"
            checked={customsNotified}
            onChange={(e) => setCustomsNotified(e.target.checked)}
          />
          I've notified customs for this border crossing (your own tracking only)
        </label>
      )}

      {navLog.legs.length === 0 ? (
        <p className="empty-hint">Add a route with at least two waypoints to generate a sheet.</p>
      ) : (
        <>
          <pre className="fp-output">{text}</pre>
          <button type="button" className="fp-copy-btn" onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy to clipboard'}
          </button>
        </>
      )}
    </div>
  )
}
