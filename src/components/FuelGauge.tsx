import type { NavLog } from '../lib/planning'

interface Props {
  navLog: NavLog
  unit?: 'L' | 'kg' // display only \u2014 navLog itself always stays in litres
  densityKgPerL?: number // conversion factor when unit is 'kg'; ignored otherwise
}

export default function FuelGauge({ navLog, unit = 'L', densityKgPerL = 1 }: Props) {
  const { usableFuelL, fuelOnBoardL, totalFuelBurnL, reserveFuelL, fuelRemainingAtLandingL, marginAboveReserveL } =
    navLog

  const factor = unit === 'kg' ? densityKgPerL : 1
  const fuelOnBoard = fuelOnBoardL * factor
  const usableFuel = usableFuelL * factor
  const fuelRemainingAtLanding = fuelRemainingAtLandingL * factor
  const totalFuelBurn = totalFuelBurnL * factor
  const reserveFuel = reserveFuelL * factor
  const marginAboveReserve = marginAboveReserveL * factor

  const boardedPct = Math.min(100, (fuelOnBoardL / usableFuelL) * 100)
  const landingPct = Math.max(0, Math.min(100, (fuelRemainingAtLandingL / usableFuelL) * 100))
  const reservePct = Math.min(100, (reserveFuelL / usableFuelL) * 100)

  const isOver = marginAboveReserveL < 0 && fuelRemainingAtLandingL >= 0
  const isDry = fuelRemainingAtLandingL < 0
  const status = isDry || isOver ? (isDry ? 'over' : 'warn') : 'ok'

  const statusMsg = isDry
    ? `Fuel runs out before landing \u2014 short by ${Math.abs(fuelRemainingAtLanding).toFixed(1)} ${unit}`
    : isOver
    ? `Lands with only ${fuelRemainingAtLanding.toFixed(1)} ${unit} \u2014 ${Math.abs(marginAboveReserve).toFixed(1)} ${unit} into your reserve`
    : `Lands with ${marginAboveReserve.toFixed(1)} ${unit} above your reserve`

  return (
    <div className="fuel-gauge">
      <div className="fuel-readout">
        <span>Fuel onboard at takeoff</span>
        <span className="value ok">{fuelOnBoard.toFixed(1)} {unit}</span>
      </div>

      <div className="fuel-gauge-track">
        {/* full boarded-fuel fill, dims as it's consumed */}
        <div className="fuel-gauge-fill boarded" style={{ ['--fill' as string]: `${boardedPct}%` }} />
        {/* what's left once this route is flown */}
        <div
          className={`fuel-gauge-fill landing ${status}`}
          style={{ ['--fill' as string]: `${landingPct}%` }}
        />
        <div
          className="fuel-gauge-reserve-marker"
          style={{ ['--marker' as string]: `${reservePct}%` }}
          title={'Reserve floor'}
        />
      </div>

      <div className="fuel-gauge-ticks">
        <span>0 {unit}</span>
        <span>{usableFuel.toFixed(0)} {unit} usable</span>
      </div>

      <div className="fuel-readout">
        <span>Fuel remaining at landing</span>
        <span className={`value ${status}`}>{fuelRemainingAtLanding.toFixed(1)} {unit}</span>
      </div>

      <div className="fuel-status-msg">{statusMsg}</div>
      <div className="fuel-status-msg">
        Trip burn {totalFuelBurn.toFixed(1)} {unit} &middot; reserve {reserveFuel.toFixed(1)} {unit}
      </div>
    </div>
  )
}
