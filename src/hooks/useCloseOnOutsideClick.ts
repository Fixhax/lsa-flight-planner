import { useEffect, type RefObject } from 'react'

// Closes a dropdown/menu/drawer-style element when the user taps or clicks
// anywhere outside it. Standard behavior for every dismissible overlay in
// this app (section menu, map long-press menu, info drawer, and any future
// one) — shared here so new ones get it for free instead of each
// reimplementing the same outside-pointerdown listener.
export function useCloseOnOutsideClick(
  ref: RefObject<HTMLElement | null>,
  isOpen: boolean,
  onClose: () => void
) {
  useEffect(() => {
    if (!isOpen) return
    function handlePointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    // Deferred so the same press/click that opened this doesn't immediately
    // close it again via this same listener.
    const id = window.setTimeout(() => document.addEventListener('pointerdown', handlePointerDown), 0)
    return () => {
      window.clearTimeout(id)
      document.removeEventListener('pointerdown', handlePointerDown)
    }
    // ref/onClose intentionally excluded — callers often pass a fresh
    // inline closure each render, which would otherwise re-attach the
    // listener on every render instead of only when isOpen changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])
}
