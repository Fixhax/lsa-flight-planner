import type { TimerAction } from '../lib/flightTimer'

interface Props {
  actions: TimerAction[]
  startEngine: () => void
  takeoff: () => void
  landing: () => void
  shutdownEngine: () => void
  onExitFullscreen: () => void
  gpsTracking: boolean
  onToggleGps: () => void
}

export default function TimerActionBar({
  actions,
  startEngine,
  takeoff,
  landing,
  shutdownEngine,
  onExitFullscreen,
  gpsTracking,
  onToggleGps
}: Props) {
  return (
    <div className="timer-action-bar">
      <button
        type="button"
        className={`live-tracking-btn timer-action-bar-gps ${gpsTracking ? 'active' : ''}`}
        onClick={onToggleGps}
      >
        &#128205; {gpsTracking ? 'Stop GPS' : 'Start GPS'}
      </button>
      <div className="timer-action-bar-buttons">
        {actions.includes('start-engine') && (
          <button type="button" className="timer-btn timer-btn-primary" onClick={startEngine}>
            &#9654; Start
          </button>
        )}
        {actions.includes('takeoff') && (
          <button type="button" className="timer-btn timer-btn-primary" onClick={takeoff}>
            &#9992; Takeoff
          </button>
        )}
        {actions.includes('landing') && (
          <button
            type="button"
            className="timer-btn timer-btn-primary timer-btn-landing"
            onClick={landing}
          >
            &#128665; Landing
          </button>
        )}
        {actions.includes('shutdown-engine') && (
          <button type="button" className="timer-btn timer-btn-secondary" onClick={shutdownEngine}>
            &#9209; Shutdown
          </button>
        )}
      </div>
      <button type="button" className="timer-action-bar-exit" onClick={onExitFullscreen}>
        Exit fullscreen
      </button>
    </div>
  )
}
