import {
  formatHM,
  formatDecimalHours,
  formatClock,
  type EngineSession,
  type TimerAction,
  type LogbookSummary
} from '../lib/flightTimer'

interface Props {
  sessions: EngineSession[]
  session: EngineSession | undefined
  leg: EngineSession['legs'][number] | undefined
  actions: TimerAction[]
  summary: LogbookSummary
  startEngine: () => void
  takeoff: () => void
  landing: () => void
  shutdownEngine: () => void
  reset: () => void
}

export default function FlightTimer({
  sessions,
  session,
  leg,
  actions,
  summary,
  startEngine,
  takeoff,
  landing,
  shutdownEngine,
  reset
}: Props) {
  return (
    <div className="flight-timer">
      <div className="timer-actions">
        {actions.includes('start-engine') && (
          <button type="button" className="timer-btn timer-btn-primary" onClick={startEngine}>
            &#9654; Start engine
          </button>
        )}
        {actions.includes('takeoff') && (
          <button type="button" className="timer-btn timer-btn-primary" onClick={takeoff}>
            &#9992; {session && session.legs.length > 0 ? 'Takeoff (next leg)' : 'Takeoff'}
          </button>
        )}
        {actions.includes('landing') && (
          <button type="button" className="timer-btn timer-btn-primary timer-btn-landing" onClick={landing}>
            &#128665; Landing
          </button>
        )}
        {actions.includes('shutdown-engine') && (
          <button type="button" className="timer-btn timer-btn-secondary" onClick={shutdownEngine}>
            &#9209; Shutdown engine
          </button>
        )}
      </div>

      {session && (
        <p className="timer-status">
          Engine running since {formatClock(session.startupAt)}
          {leg && !leg.landingAt && ` \u00b7 airborne since ${formatClock(leg.takeoffAt)}`}
        </p>
      )}

      {summary.legCount > 0 && (
        <>
          <div className="timer-log">
            {sessions.map((s, si) => (
              <div className="timer-session-row" key={s.id}>
                <span className="timer-session-label">
                  Engine {si + 1}: {formatClock(s.startupAt)}
                  {s.shutdownAt ? `\u2013${formatClock(s.shutdownAt)}` : ' (running)'}
                </span>
                {s.legs.map((l, li) => (
                  <span className="timer-leg-label" key={l.id}>
                    Leg {li + 1}: {formatClock(l.takeoffAt)}
                    {l.landingAt ? `\u2013${formatClock(l.landingAt)}` : ' (airborne)'}
                  </span>
                ))}
              </div>
            ))}
          </div>

          <div className="totals-grid timer-summary">
            <div>
              <div className="stat-label">Airframe (flight) time</div>
              <div className="stat-value">{formatHM(summary.totalFlightMinutes)}</div>
              <div className="stat-sub">{formatDecimalHours(summary.totalFlightMinutes)} hrs</div>
            </div>
            <div>
              <div className="stat-label">Engine time</div>
              <div className="stat-value">{formatHM(summary.totalEngineMinutes)}</div>
              <div className="stat-sub">{formatDecimalHours(summary.totalEngineMinutes)} hrs</div>
            </div>
          </div>

          <button type="button" className="timer-reset-btn" onClick={reset}>
            Reset trip
          </button>
        </>
      )}

      <p className="footnote">
        Airframe time is summed takeoff-to-landing across all legs; engine time is summed
        start-up-to-shutdown &mdash; these differ whenever the engine keeps running through a
        stop (common in bush flying) or idles before/after the flight portion. Times use this
        device's clock. Nothing here is saved if you close the app. This also runs in the
        fullscreen map view (Route panel) so you can time patterns while watching the map.
      </p>
    </div>
  )
}
