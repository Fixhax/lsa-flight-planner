import { useEffect, useState } from 'react'
import { loadFlightTracks, type SavedFlightTrack } from '../lib/cloudSync'
import { formatClock } from '../lib/flightTimer'

interface Props {
  userId: string | null
  refreshKey: number
  selectedTrackId: string | null
  onSelect: (track: SavedFlightTrack | null) => void
}

export default function FlightHistory({ userId, refreshKey, selectedTrackId, onSelect }: Props) {
  const [tracks, setTracks] = useState<SavedFlightTrack[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!userId) {
      setTracks([])
      return
    }
    setLoading(true)
    loadFlightTracks(userId).then((t) => {
      setTracks(t)
      setLoading(false)
    })
  }, [userId, refreshKey])

  if (!userId) {
    return <p className="empty-hint">Sign in to save and browse past flight tracks.</p>
  }

  if (loading) return <p className="footnote">Loading flight history&hellip;</p>

  if (tracks.length === 0) {
    return (
      <p className="empty-hint">
        No saved flights yet &mdash; turn on GPS tracking (Live tracking panel) before takeoff and
        leave it running until you log the landing in the flight timer; the track saves here
        automatically.
      </p>
    )
  }

  return (
    <div className="flight-history-list">
      {tracks.map((t) => {
        const durationMin = Math.round((t.endedAt - t.startedAt) / 60000)
        const date = new Date(t.startedAt)
        const isSelected = t.id === selectedTrackId
        return (
          <div className="flight-history-row" key={t.id}>
            <div className="flight-history-meta">
              <strong>
                {date.toLocaleDateString()} {formatClock(t.startedAt)}
              </strong>
              <span>
                {durationMin} min{t.distanceNm ? ` · ${t.distanceNm.toFixed(1)} nm` : ''}
              </span>
            </div>
            <button
              type="button"
              className={isSelected ? 'flight-history-toggle active' : 'flight-history-toggle'}
              onClick={() => onSelect(isSelected ? null : t)}
            >
              {isSelected ? 'Hide track' : 'Show on map'}
            </button>
          </div>
        )
      })}
    </div>
  )
}
