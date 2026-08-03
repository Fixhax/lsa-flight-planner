import type { NavLog as NavLogData, Waypoint } from '../lib/planning'
import { formatMinutes } from '../lib/planning'
import { ktToUnit, speedUnitLabel, type SpeedUnit } from '../lib/units'

function deg(n: number): string {
  return `${Math.round(n).toString().padStart(3, '0')}\u00b0`
}

function wpMeta(wp: Waypoint): string {
  const elev = wp.elevationFt !== undefined ? `${wp.elevationFt}ft elev` : 'elev \u2014'
  const rwy = wp.runway ? `rwy ${wp.runway}` : 'rwy \u2014'
  return `${elev} \u00b7 ${rwy}`
}

export default function NavLog({
  navLog,
  speedUnit
}: {
  navLog: NavLogData
  speedUnit: SpeedUnit
}) {
  if (navLog.legs.length === 0) {
    return <p className="empty-hint">Add at least two waypoints to see the nav log.</p>
  }

  return (
    <div className="nav-log">
      {navLog.legs.map((leg, i) => (
        <div className="leg-card" key={`${leg.from.id}-${leg.to.id}`}>
          <div className="leg-title">
            <span>
              {leg.from.name || `WP${i + 1}`} &rarr; {leg.to.name || `WP${i + 2}`}
            </span>
            <span className="leg-index">LEG {i + 1}</span>
          </div>
          <div className="leg-endpoints">
            <span>{wpMeta(leg.from)}</span>
            <span className="leg-endpoints-arrow">&rarr;</span>
            <span>{wpMeta(leg.to)}</span>
          </div>
          <div className="leg-grid">
            <div>
              <div className="stat-label">Distance</div>
              <div className="stat-value">{leg.distanceNm.toFixed(1)} nm</div>
            </div>
            <div>
              <div className="stat-label">True course</div>
              <div className="stat-value">{deg(leg.trueCourseDeg)}</div>
            </div>
            <div>
              <div className="stat-label">Heading</div>
              <div className="stat-value">{deg(leg.trueHeadingDeg)}</div>
            </div>
            <div>
              <div className="stat-label">WCA</div>
              <div className="stat-value">
                {leg.windCorrectionAngleDeg >= 0 ? '+' : ''}
                {leg.windCorrectionAngleDeg.toFixed(0)}&deg;
              </div>
            </div>
            <div>
              <div className="stat-label">Ground speed</div>
              <div className="stat-value">
                {ktToUnit(leg.groundSpeedKt, speedUnit).toFixed(0)} {speedUnitLabel[speedUnit]}
              </div>
            </div>
            <div>
              <div className="stat-label">Time</div>
              <div className="stat-value">{formatMinutes(leg.timeMinutes)}</div>
            </div>
            <div>
              <div className="stat-label">Fuel left</div>
              <div className="stat-value">{leg.fuelRemainingAfterL.toFixed(1)} L</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
