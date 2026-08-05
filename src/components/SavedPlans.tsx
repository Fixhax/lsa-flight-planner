import { useEffect, useState } from 'react'
import {
  loadSavedPlans,
  createSavedPlan,
  renameSavedPlan,
  overwriteSavedPlan,
  deleteSavedPlan,
  type SavedPlanEntry
} from '../lib/cloudSync'
import type { PersistedPlan } from '../lib/persistence'

interface Props {
  userId: string | null
  getCurrentPlan: () => PersistedPlan
  onLoad: (plan: PersistedPlan) => void
}

// A library of named snapshots, separate from the single plan that's
// always open and continuously autosaving in the background — saving here
// is explicit ("Save as"), never automatic, so it's safe to use as a set
// of deliberate checkpoints (different routes, different days) rather than
// something that silently overwrites itself.
export default function SavedPlans({ userId, getCurrentPlan, onLoad }: Props) {
  const [plans, setPlans] = useState<SavedPlanEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [newName, setNewName] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setPlans([])
      return
    }
    setLoading(true)
    loadSavedPlans(userId).then((p) => {
      setPlans(p)
      setLoading(false)
    })
  }, [userId])

  function refresh() {
    if (!userId) return
    loadSavedPlans(userId).then(setPlans)
  }

  async function handleSaveAsNew() {
    if (!userId) return
    const name = newName.trim()
    if (!name) return
    setNewName('')
    await createSavedPlan(userId, name, getCurrentPlan())
    refresh()
  }

  async function handleOverwrite(entry: SavedPlanEntry) {
    if (!userId) return
    if (!confirm(`Overwrite "${entry.name}" with your current plan?`)) return
    setBusyId(entry.id)
    await overwriteSavedPlan(userId, entry.id, getCurrentPlan())
    setBusyId(null)
    refresh()
  }

  async function handleRename(entry: SavedPlanEntry) {
    if (!userId) return
    const name = prompt('Rename plan', entry.name)?.trim()
    if (!name || name === entry.name) return
    setPlans((prev) => prev.map((p) => (p.id === entry.id ? { ...p, name } : p)))
    await renameSavedPlan(userId, entry.id, name)
  }

  async function handleDelete(entry: SavedPlanEntry) {
    if (!userId) return
    if (!confirm(`Delete saved plan "${entry.name}"? This can’t be undone.`)) return
    setPlans((prev) => prev.filter((p) => p.id !== entry.id))
    await deleteSavedPlan(userId, entry.id)
  }

  if (!userId) {
    return <p className="empty-hint">Sign in to save and load more than one named flight plan.</p>
  }

  return (
    <div className="saved-plans">
      <div className="saved-plans-new-row">
        <input
          type="text"
          className="saved-plans-name-input"
          placeholder="Name this plan (e.g. “Saturday club trip”)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSaveAsNew()}
        />
        <button type="button" className="saved-plans-save-btn" onClick={handleSaveAsNew} disabled={!newName.trim()}>
          Save as new
        </button>
      </div>

      {loading && <p className="footnote">Loading saved plans&hellip;</p>}

      {!loading && plans.length === 0 && (
        <p className="empty-hint">
          No saved plans yet — set up your route, aircraft, and weights above, then name and save
          it here. Your currently-open plan keeps autosaving on its own regardless of this list.
        </p>
      )}

      {plans.length > 0 && (
        <div className="saved-plans-list">
          {plans.map((entry) => (
            <div className="saved-plans-row" key={entry.id}>
              <div className="saved-plans-meta">
                <strong>{entry.name}</strong>
                <span>Updated {new Date(entry.updatedAt).toLocaleDateString()}</span>
              </div>
              <div className="saved-plans-actions">
                <button type="button" className="saved-plans-load-btn" onClick={() => onLoad(entry.data)}>
                  Load
                </button>
                <button
                  type="button"
                  className="saved-plans-overwrite-btn"
                  onClick={() => handleOverwrite(entry)}
                  disabled={busyId === entry.id}
                >
                  Overwrite
                </button>
                <button type="button" className="saved-plans-rename-btn" onClick={() => handleRename(entry)}>
                  Rename
                </button>
                <button
                  type="button"
                  className="saved-plans-delete"
                  aria-label={`Delete ${entry.name}`}
                  onClick={() => handleDelete(entry)}
                >
                  &times;
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
