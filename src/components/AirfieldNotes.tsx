import { useEffect, useState } from 'react'
import { loadAirfieldNotes, addAirfieldNote, deleteAirfieldNote, type AirfieldNote } from '../lib/cloudSync'

interface Props {
  stripId: string
  userId: string | null
  userEmail: string | null
}

// Community tips left on a curated airfield — shared across every signed-in
// pilot, so this is intentionally not scoped to just the current user like
// the rest of this app's cloud data. Requires an account to post (so a
// note has a real author), same as the rest of this app already does.
export default function AirfieldNotes({ stripId, userId, userEmail }: Props) {
  const [notes, setNotes] = useState<AirfieldNote[]>([])
  const [loading, setLoading] = useState(false)
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)

  useEffect(() => {
    setNotes([])
    setDraft('')
    if (!userId) return
    setLoading(true)
    loadAirfieldNotes(stripId).then((n) => {
      setNotes(n)
      setLoading(false)
    })
  }, [stripId, userId])

  async function handlePost() {
    if (!userId || !draft.trim()) return
    setPosting(true)
    await addAirfieldNote(userId, userEmail, stripId, draft.trim())
    setDraft('')
    setNotes(await loadAirfieldNotes(stripId))
    setPosting(false)
  }

  async function handleDelete(note: AirfieldNote) {
    if (!userId) return
    if (!confirm('Delete this note?')) return
    setNotes((prev) => prev.filter((n) => n.id !== note.id))
    deleteAirfieldNote(userId, note.id)
  }

  if (!userId) {
    return <p className="map-airfield-panel-muted">Sign in to read and leave pilot notes.</p>
  }

  return (
    <div className="airfield-notes">
      {loading && <p className="map-airfield-panel-muted">Loading notes&hellip;</p>}
      {!loading && notes.length === 0 && (
        <p className="map-airfield-panel-muted">No notes yet — be the first to leave a tip.</p>
      )}
      {notes.map((n) => (
        <div className="airfield-note" key={n.id}>
          <p className="airfield-note-body">{n.body}</p>
          <p className="airfield-note-meta">
            {n.authorEmail ?? 'A pilot'} &middot; {new Date(n.createdAt).toLocaleDateString()}
            {n.userId === userId && (
              <button
                type="button"
                className="airfield-note-delete"
                aria-label="Delete note"
                onClick={() => handleDelete(n)}
              >
                &times;
              </button>
            )}
          </p>
        </div>
      ))}
      <textarea
        className="airfield-note-input"
        placeholder="Leave a tip for the next pilot (e.g. soft after rain, watch the ditch near the threshold)…"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={2}
      />
      <button
        type="button"
        className="airfield-note-post-btn"
        onClick={handlePost}
        disabled={!draft.trim() || posting}
      >
        {posting ? 'Posting…' : 'Add note'}
      </button>
    </div>
  )
}
