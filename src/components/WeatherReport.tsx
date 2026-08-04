import { useState } from 'react'
import type { Waypoint } from '../lib/planning'
import { fetchWeatherReport, type WeatherReportPoint } from '../lib/weatherReport'

export default function WeatherReport({ waypoints }: { waypoints: Waypoint[] }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [points, setPoints] = useState<WeatherReportPoint[] | null>(null)

  const valid = waypoints.filter(
    (w) => Number.isFinite(w.lat) && Number.isFinite(w.lon) && (w.lat !== 0 || w.lon !== 0)
  )
  const departure = valid[0]
  const destination = valid[valid.length - 1]

  async function handleFetch() {
    if (valid.length === 0) {
      setError('Add at least one waypoint first.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const targets =
        valid.length === 1 || departure === destination
          ? [{ label: departure.name || 'Waypoint', wp: departure }]
          : [
              { label: departure.name || 'Departure', wp: departure },
              { label: destination.name || 'Destination', wp: destination }
            ]
      const results = await Promise.all(
        targets.map((t) => fetchWeatherReport(t.wp.lat, t.wp.lon, t.label))
      )
      setPoints(results)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not fetch weather report.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="weather-report">
      <button type="button" className="fetch-weather-btn" onClick={handleFetch} disabled={loading}>
        {loading ? 'Fetching report\u2026' : 'Fetch weather report for route'}
      </button>
      {error && <p className="auth-error">{error}</p>}

      {points && (
        <div className="weather-report-cards">
          {points.map((p) => (
            <div className="weather-report-card" key={p.label}>
              <p className="weather-report-location">{p.label}</p>
              <div className="weather-report-main">
                <span className="weather-report-temp">{Math.round(p.tempC)}&deg;C</span>
                <span className="weather-report-desc">{p.weatherDesc}</span>
              </div>
              <div className="totals-grid weather-report-grid">
                <div>
                  <div className="stat-label">Wind</div>
                  <div className="stat-value">
                    {Math.round(p.windDirTrueDeg)}&deg;/{Math.round(p.windSpeedKt)}kt
                  </div>
                </div>
                <div>
                  <div className="stat-label">Cloud cover</div>
                  <div className="stat-value">{Math.round(p.cloudCoverPct)}%</div>
                </div>
                <div>
                  <div className="stat-label">Precip. chance</div>
                  <div className="stat-value">{Math.round(p.precipProbPct)}%</div>
                </div>
                <div>
                  <div className="stat-label">Visibility</div>
                  <div className="stat-value">{(p.visibilityM / 1000).toFixed(1)} km</div>
                </div>
              </div>
              <p className="footnote">Valid {p.validTime.slice(11, 16)} local at this point.</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
