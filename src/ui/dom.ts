// Tiny DOM helpers for the vanilla-TS UI. No framework, no innerHTML except for our own static SVG strings.

export type Child = Node | string | null | undefined | false

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  ...kids: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  for (const k of Object.keys(attrs)) el.setAttribute(k, attrs[k])
  put(el, ...kids)
  return el
}

/** Append children, skipping null, undefined and false (the native append would print "null"). */
export function put(el: Element, ...kids: Child[]): void {
  for (const kid of kids) {
    if (kid !== null && kid !== undefined && kid !== false) el.append(kid)
  }
}

/** What every screen returns: its root element and an optional teardown. */
export interface ScreenHandle {
  el: HTMLElement
  destroy?: () => void
}

/** One screen root. tabindex -1 so the app can move focus to it on navigation. */
export function screenEl(cls: string): HTMLElement {
  return h('main', { class: cls, tabindex: '-1' })
}

export function reduced(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export type IconName = 'lock' | 'target' | 'ring' | 'slash' | 'sun' | 'moon' | 'chevron' | 'close' | 'copy'

// Single-line markup on purpose: no whitespace text nodes inside the svg, so textContent stays empty.
const PATHS: Record<IconName, string> = {
  lock: '<rect x="5" y="11" width="14" height="10" rx="1.5" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.4"/>',
  target:
    '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="12" cy="12" r="3.6" fill="currentColor"/><path d="M12 1v5M12 18v5M1 12h5M18 12h5" stroke="currentColor" stroke-width="2.4"/>',
  ring: '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="3"/>',
  slash:
    '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="3"/><path d="M6 18L18 6" stroke="currentColor" stroke-width="3"/>',
  sun: '<circle cx="12" cy="12" r="4.5" fill="currentColor"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" stroke="currentColor" stroke-width="2" fill="none"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="currentColor"/>',
  chevron: '<path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6"/>',
  close: '<path d="M5 5l14 14M19 5L5 19" stroke="currentColor" stroke-width="2.6" fill="none"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="1.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8" fill="none" stroke="currentColor" stroke-width="2.2"/>',
}

/** Decorative icon. The svg is aria-hidden and has no <title>. */
export function icon(name: IconName, size = 20): HTMLElement {
  const wrap = document.createElement('span')
  wrap.className = 'icon'
  wrap.setAttribute('aria-hidden', 'true')
  wrap.innerHTML = `<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="${size}" height="${size}">${PATHS[name]}</svg>`
  return wrap
}
