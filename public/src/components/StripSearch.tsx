import { useMemo, useState } from 'react'
import { airstrips, type AirstripEntry } from '../data/strips'

interface Props {
  onSelect: (strip: AirstripEntry) => void
}

const flag: Record<AirstripEntry['country'], string> = {
  NO: '\u{1F1F3}\u{1F1F4}',
  SE: '\u{1F1F8}\u{1F1EA}'
}

export default function StripSearch({ onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  // Empty query shows the full list (dropdown behavior); typing filters it.
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return airstrips
    return airstrips.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.icao?.toLowerCase().includes(q) ||
        s.region.toLowerCase().includes(q)
    )
  }, [query])

  function pick(strip: AirstripEntry) {
    onSelect(strip)
    setQuery('')
    setOpen(false)
  }

  return (
    <div className="strip-search">
      <button
        type="button"
        className="strip-search-input strip-dropdown-trigger"
        onClick={() => setOpen((o) => !o)}
      >
        {'Choose a grass/gravel strip (NO/SE)\u2026'}
        <span className="dropdown-caret">&#9662;</span>
      </button>
      {open && (
        <div className="strip-search-panel">
          <input
            className="strip-filter-input"
            placeholder={'Filter by name, ICAO, or region\u2026'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            autoFocus
          />
          <div className="strip-search-results">
            {matches.length === 0 && (
              <div className="strip-search-empty">No matches in the starter list.</div>
            )}
            {matches.map((s) => (
              <button
                key={s.id}
                className="strip-search-result"
                onMouseDown={() => pick(s)}
                type="button"
              >
                <span className="strip-flag">{flag[s.country]}</span>
                <span className="strip-info">
                  <span className="strip-name">
                    {s.name}
                    {s.icao ? ` (${s.icao})` : ''}
                  </span>
                  <span className="strip-meta">
                    {s.region} &middot; {s.surface}
                    {s.runway ? ` \u00b7 rwy ${s.runway}` : ''}
                    {s.lengthM ? ` \u00b7 ${s.lengthM}m` : ' \u00b7 length \u2014'}
                    {s.elevationFt !== undefined ? ` \u00b7 ${s.elevationFt}ft elev` : ' \u00b7 elev \u2014'}
                  </span>
                  {s.note && <span className="strip-note">{s.note}</span>}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
