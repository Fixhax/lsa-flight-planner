import { useState } from 'react'

interface ChecklistGroup {
  title: string
  items: string[]
}

// Generic reference items only, not any specific aircraft's published
// checklist — see the caveat rendered below. Deliberately not persisted
// across reloads (a checklist that silently remembers yesterday's checked
// boxes is worse than no checklist at all); it does reset within a
// session via the button below.
const GROUPS: ChecklistGroup[] = [
  {
    title: 'Pre-flight inspection',
    items: [
      'Documents on board (registration, insurance, POH)',
      'Fuel quantity and quality checked (visual + drain sample)',
      'Oil level checked',
      'Control surfaces free and correct',
      'Tires, brakes, and landing gear checked',
      'Pitot/static ports and vents clear',
      'Tie-downs, covers, and chocks removed'
    ]
  },
  {
    title: 'Before takeoff',
    items: [
      'Seatbelts and doors secure',
      'Flight controls free and correct',
      'Trim set for takeoff',
      'Fuel selector set, fuel pump on (if equipped)',
      'Engine instruments in the green',
      'Radio and transponder set',
      'Runway, pattern, and traffic checked'
    ]
  },
  {
    title: 'Before landing',
    items: [
      'Seatbelts secure',
      'Fuel selector and quantity checked',
      'Mixture set',
      'Carb heat as required',
      'Landing light on',
      'Pattern altitude and radio calls made'
    ]
  }
]

function itemKey(groupIdx: number, itemIdx: number): string {
  return `${groupIdx}-${itemIdx}`
}

export default function Checklist() {
  const [checked, setChecked] = useState<Set<string>>(new Set())

  function toggle(key: string) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="checklist">
      <p className="empty-hint">
        Generic reference items, not any specific aircraft's published checklist — always fly
        your aircraft's actual POH/AFM checklist. Not saved between visits on purpose, so it
        can't show yesterday's boxes as already checked.
      </p>
      {GROUPS.map((group, gi) => (
        <div className="checklist-group" key={group.title}>
          <p className="checklist-group-title">{group.title}</p>
          <ul className="checklist-items">
            {group.items.map((item, ii) => {
              const key = itemKey(gi, ii)
              const isChecked = checked.has(key)
              return (
                <li key={key}>
                  <label className={isChecked ? 'checklist-item checked' : 'checklist-item'}>
                    <input type="checkbox" checked={isChecked} onChange={() => toggle(key)} />
                    {item}
                  </label>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
      <button
        type="button"
        className="checklist-reset-btn"
        onClick={() => setChecked(new Set())}
        disabled={checked.size === 0}
      >
        Reset all
      </button>
    </div>
  )
}
