import { useEffect, useState } from 'react'
import type { Waypoint } from '../lib/planning'
import { fetchSunEvents, trimSeconds, type SunEventsOutcome } from '../lib/sunTimes'

export default function DaylightInfo({ waypoints }: { waypoints: Waypoint[] }) {
  const valid = waypoints.filter(
    (w) => Number.isFinite(w.lat) && Number.isFinite(w.lon) && (w.lat !== 0 || w.lon !== 0)
  )
  const destination = valid[valid.length - 1]

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<SunEventsOutcome | null>(null)

  useEffect(() => {
    if (!destination) {
      setOutcome(null)
      setError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchSunEvents(destination.lat, destination.lon)
      .then((res) => {
        if (!cancelled) setOutcome(res)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not fetch sun times.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // Re-fetch whenever the destination's coordinates change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination?.lat, destination?.lon])

  if (!destination) {
    return <p className="empty-hint">Add a destination waypoint to see sunset/twilight there.</p>
  }

  const label = destination.name || 'destination'

  return (
    <div className="daylight-info">
      {loading && <p className="footnote">Fetching sun times&hellip;</p>}
      {error && <p className="auth-error">{error}</p>}
      {!loading && !error && outcome?.kind === 'unavailable' && (
        <p className="footnote">
          No normal sunset today at {label} &mdash; likely midnight sun or polar night at this
          latitude/date.
        </p>
      )}
      {!loading && !error && outcome?.kind === 'ok' && (
        <>
          <div className="fuel-readout">
            <span>Sunset at {label}</span>
            <span className="value ok">{trimSeconds(outcome.result.sunset)}</span>
          </div>
          <div className="fuel-readout">
            <span>End of evening civil twilight</span>
            <span className="value ok">{trimSeconds(outcome.result.civilDuskEnd)}</span>
          </div>
          <p className="footnote">
            Local time ({outcome.result.timezone}), fetched live for today (
            {outcome.result.date}).
          </p>
        </>
      )}
    </div>
  )
}
