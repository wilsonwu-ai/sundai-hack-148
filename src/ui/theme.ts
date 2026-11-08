// Dark by default, light via the top-bar toggle, prefers-color-scheme honoured on the first visit.
import { h, icon } from './dom'

export type Theme = 'dark' | 'light'

const KEY = 'defy-theme'
const BAR_COLOR: Record<Theme, string> = { dark: '#0D0E11', light: '#F3EFE6' }

export function getTheme(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
}

function apply(t: Theme): void {
  document.documentElement.setAttribute('data-theme', t)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', BAR_COLOR[t])
}

export function initTheme(): void {
  let saved: string | null = null
  try {
    saved = window.localStorage.getItem(KEY)
  } catch {
    saved = null
  }
  if (saved === 'light' || saved === 'dark') {
    apply(saved)
    return
  }
  apply(window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
}

export function toggleTheme(): Theme {
  const next: Theme = getTheme() === 'light' ? 'dark' : 'light'
  apply(next)
  try {
    window.localStorage.setItem(KEY, next)
  } catch {
    // storage can be blocked (private mode); the theme still applies for this visit
  }
  return next
}

/** 48 px top-bar toggle. It shows the theme you would switch to. */
export function themeButton(): HTMLButtonElement {
  const b = h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Switch between dark and light theme' })
  const paint = (): void => b.replaceChildren(icon(getTheme() === 'light' ? 'moon' : 'sun', 22))
  paint()
  b.addEventListener('click', () => {
    toggleTheme()
    paint()
  })
  return b
}
