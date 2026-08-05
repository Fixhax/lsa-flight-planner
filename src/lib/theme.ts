export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'lsa-planner-theme'

function getStoredTheme(): Theme | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'dark' || v === 'light' ? v : null
  } catch {
    return null
  }
}

function getSystemTheme(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

/** Your explicit choice if you've made one, else whatever your device prefers. */
export function getInitialTheme(): Theme {
  return getStoredTheme() ?? getSystemTheme()
}

/** Sets the theme on the document root (index.css keys its light palette off this) and remembers it. */
export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // ignore — private browsing or storage full; the choice just won't stick across reloads
  }
}
