import type { NavLog } from '../lib/planning'

interface Props {
  navLog: NavLog
}

export default function FuelGauge({ navLog }: Props) {
  const { usableFuelL, fuelOnBoardL, totalFuelBurnL, reserveFuelL, fuelRemainingAtLandingL, marginAboveReserveL } =
    navLog

  const boardedPct = Math.min(100, (fuelOnBoardL / usableFuelL) * 100)
  const landingPct = Math.max(0, Math.min(100, (fuelRemainingAtLandingL / usableFuelL) * 100))
  const reservePct = Math.min(100, (reserveFuelL / usableFuelL) * 100)

  const isOver = marginAboveReserveL < 0 && fuelRemainingAtLandingL >= 0
  const isDry = fuelRemainingAtLandingL < 0
  const status = isDry || isOver ? (isDry ? 'over' : 'warn') : 'ok'

  const statusMsg = isDry
    ? `Fuel runs out before landing \u2014 short by ${Math.abs(fuelRemainingAtLandingL).toFixed(1)} L`
    : isOver
    ? `Lands with only ${fuelRemainingAtLandingL.toFixed(1)} L \u2014 ${Math.abs(marginAboveReserveL).toFixed(1)} L into your reserve`
    : `Lands with ${marginAboveReserveL.toFixed(1)} L above your reserve`

  return (
    <div className="fuel-gauge">
      <div className="fuel-readout">
        <span>Fuel onboard at takeoff</span>
        <span className="value ok">{fuelOnBoardL.toFixed(1)} L</span>
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
        <span>0 L</span>
        <span>{usableFuelL.toFixed(0)} L usable</span>
      </div>

      <div className="fuel-readout">
        <span>Fuel remaining at landing</span>
        <span className={`value ${status}`}>{fuelRemainingAtLandingL.toFixed(1)} L</span>
      </div>

      <div className="fuel-status-msg">{statusMsg}</div>
      <div className="fuel-status-msg">
        Trip burn {totalFuelBurnL.toFixed(1)} L &middot; reserve {reserveFuelL.toFixed(1)} L
      </div>
    </div>
  )
}
