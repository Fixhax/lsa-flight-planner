import { useEffect, useRef, useState } from 'react'

export interface SectionGroup {
  label: string
  sections: { id: string; label: string }[]
}

interface Props {
  groups: SectionGroup[]
  openSections: Set<string>
  onToggle: (id: string) => void
}

export default function SectionMenu({ groups, openSections, onToggle }: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  const openCount = openSections.size

  return (
    <div className="section-menu" ref={containerRef}>
      <button type="button" className="section-menu-trigger" onClick={() => setOpen((o) => !o)}>
        <span>
          Sections{' '}
          <span className="section-menu-count">
            ({openCount} open)
          </span>
        </span>
        <span className="dropdown-caret">&#9662;</span>
      </button>
      {open && (
        <div className="section-menu-panel">
          {groups.map((group) => (
            <div className="section-menu-group" key={group.label}>
              <p className="section-menu-group-label">{group.label}</p>
              {group.sections.map((s) => (
                <label className="section-menu-item" key={s.id}>
                  <input
                    type="checkbox"
                    checked={openSections.has(s.id)}
                    onChange={() => onToggle(s.id)}
                  />
                  {s.label}
                </label>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
