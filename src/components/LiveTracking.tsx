import type { Waypoint } from '../lib/planning'
import { estimateRemaining, type LivePosition } from '../lib/liveTracking'
import { ktToUnit, speedUnitLabel, type SpeedUnit } from '../lib/units'

interface Props {
  waypoints: Waypoint[]
  fallbackGroundSpeedKt: number
  speedUnit: SpeedUnit
  tracking: boolean
  position: LivePosition | null
  error: string | null
  start: () => void
  stop: () => void
  wakeLockSupported?: boolean
  wakeLockHeld?: boolean
}

export default function LiveTracking({
  waypoints,
  fallbackGroundSpeedKt,
  speedUnit,
  tracking,
  position,
  error,
  start,
  stop,
  wakeLockSupported,
  wakeLockHeld
}: Props) {
  const remaining = position ? estimateRemaining(waypoints, position, fallbackGroundSpeedKt) : null

  return (
    <div className="live-tracking">
      <button
        type="button"
        className={`live-tracking-btn ${tracking ? 'active' : ''}`}
        onClick={tracking ? stop : start}
      >
        {tracking ? 'Stop GPS tracking' : 'Start GPS tracking'}
      </button>

      {error && <p className="auth-error">{error}</p>}

      {tracking && !position && !error && (
        <p className="live-tracking-status">Waiting for a GPS fix&hellip;</p>
      )}

      {position && (
        <>
          <p className="live-tracking-status">
            Accuracy &plusmn;{position.accuracyM ? Math.round(position.accuracyM) : '?'} m
            {remaining?.usingGpsSpeed && ' \u00b7 using live GPS ground speed'}
            {wakeLockSupported === false
              ? ' \u00b7 screen may still sleep (not supported on this browser)'
              : wakeLockHeld && ' \u00b7 screen kept awake'}
          </p>
          {remaining && Number.isFinite(remaining.etaMs) ? (
            <div className="totals-grid timer-summary">
              <div>
                <div className="stat-label">Remaining distance</div>
                <div className="stat-value">{remaining.remainingNm.toFixed(1)} nm</div>
              </div>
              <div>
                <div className="stat-label">ETA</div>
                <div className="stat-value">
                  {new Date(remaining.etaMs).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
              <div>
                <div className="stat-label">Ground speed</div>
                <div className="stat-value">
                  {ktToUnit(remaining.groundSpeedKt, speedUnit).toFixed(0)} {speedUnitLabel[speedUnit]}
                </div>
              </div>
              <div>
                <div className="stat-label">Time remaining</div>
                <div className="stat-value">
                  {(() => {
                    const mins = Math.max(0, (remaining.etaMs - Date.now()) / 60000)
                    const h = Math.floor(mins / 60)
                    const m = Math.round(mins % 60)
                    return `${h}h ${m.toString().padStart(2, '0')}m`
                  })()}
                </div>
              </div>
            </div>
          ) : (
            <p className="empty-hint">
              Add a route with at least two waypoints to see ETA and remaining distance.
            </p>
          )}
        </>
      )}
    </div>
  )
}
