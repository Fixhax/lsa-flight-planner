import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'

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
  const didRepeatRef = useRef(false)

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

  function stopRepeat() {
    if (repeatTimeoutRef.current) clearTimeout(repeatTimeoutRef.current)
    if (repeatIntervalRef.current) clearInterval(repeatIntervalRef.current)
    repeatTimeoutRef.current = null
    repeatIntervalRef.current = null
  }

  useEffect(() => stopRepeat, [])

  // The single-step tap is handled by plain onClick — the most reliable
  // way to detect "the user tapped this" across browsers/devices, with
  // none of the touch-tracking edge cases pointer events can have (and
  // the same event type every other button in this app already relies
  // on). Holding the button down additionally starts a repeat, after a
  // short delay, via pointer events; when that's happened, the click that
  // fires on release is suppressed so releasing a long press doesn't also
  // add one extra step on top of what the repeat already did.
  function handleClick(delta: number) {
    return () => {
      if (didRepeatRef.current) {
        didRepeatRef.current = false
        return
      }
      bump(delta)
    }
  }

  function handlePointerDown(delta: number) {
    return (e: ReactPointerEvent<HTMLButtonElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId)
      didRepeatRef.current = false
      repeatTimeoutRef.current = setTimeout(() => {
        didRepeatRef.current = true
        bump(delta)
        repeatIntervalRef.current = setInterval(() => bump(delta), 90)
      }, 450)
    }
  }

  function handlePointerUp(e: ReactPointerEvent<HTMLButtonElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    stopRepeat()
  }

  return (
    <div className="number-stepper">
      <button
        type="button"
        className="number-stepper-btn"
        onClick={handleClick(-step)}
        onPointerDown={handlePointerDown(-step)}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
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
        onClick={handleClick(step)}
        onPointerDown={handlePointerDown(step)}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        disabled={max !== undefined && value >= max}
        aria-label={ariaLabel ? `Increase ${ariaLabel}` : 'Increase'}
      >
        +
      </button>
    </div>
  )
}
