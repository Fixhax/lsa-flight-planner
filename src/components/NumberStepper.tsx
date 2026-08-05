import { useEffect, useRef } from 'react'

interface Props {
  id?: string
  value: number
  onChange: (value: number) => void
  step?: number
  min?: number
  max?: number
  decimals?: number
  ariaLabel?: string
}

// A number input with +/- buttons, so weight/altitude/speed/quantity
// fields can be bumped by tapping instead of clearing and retyping.
// Holding a button down repeats it (starts after a short delay, then
// keeps going) — a plain single-step tap would take far too many taps to
// move something like cruise altitude any meaningful distance.
export default function NumberStepper({
  id,
  value,
  onChange,
  step = 1,
  min,
  max,
  decimals = 0,
  ariaLabel
}: Props) {
  const valueRef = useRef(value)
  valueRef.current = value
  const repeatTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const repeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function clamp(v: number) {
    const scale = 10 ** decimals
    let next = Math.round(v * scale) / scale
    if (min !== undefined) next = Math.max(min, next)
    if (max !== undefined) next = Math.min(max, next)
    return next
  }

  function bump(delta: number) {
    onChange(clamp(valueRef.current + delta))
  }

  function startRepeat(delta: number) {
    bump(delta)
    repeatTimeoutRef.current = setTimeout(() => {
      repeatIntervalRef.current = setInterval(() => bump(delta), 90)
    }, 450)
  }

  function stopRepeat() {
    if (repeatTimeoutRef.current) clearTimeout(repeatTimeoutRef.current)
    if (repeatIntervalRef.current) clearInterval(repeatIntervalRef.current)
    repeatTimeoutRef.current = null
    repeatIntervalRef.current = null
  }

  useEffect(() => stopRepeat, [])

  return (
    <div className="number-stepper">
      <button
        type="button"
        className="number-stepper-btn"
        onPointerDown={() => startRepeat(-step)}
        onPointerUp={stopRepeat}
        onPointerLeave={stopRepeat}
        onPointerCancel={stopRepeat}
        disabled={min !== undefined && value <= min}
        aria-label={ariaLabel ? `Decrease ${ariaLabel}` : 'Decrease'}
      >
        &minus;
      </button>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(clamp(Number(e.target.value) || 0))}
      />
      <button
        type="button"
        className="number-stepper-btn"
        onPointerDown={() => startRepeat(step)}
        onPointerUp={stopRepeat}
        onPointerLeave={stopRepeat}
        onPointerCancel={stopRepeat}
        disabled={max !== undefined && value >= max}
        aria-label={ariaLabel ? `Increase ${ariaLabel}` : 'Increase'}
      >
        +
      </button>
    </div>
  )
}
