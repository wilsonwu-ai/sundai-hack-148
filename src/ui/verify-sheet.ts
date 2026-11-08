// "Check every seal" bottom sheet. Every row is recomputed live in this browser with the engine's verify().
import type { Seal } from '../contracts'
import { short, verify } from '../engine/seal'
import { h, icon } from './dom'

export interface SealRow {
  /** 1..12 */
  n: number
  id: string
  name: string
  seal: Seal
}

function middle(s: string): string {
  return s.length > 16 ? `${s.slice(0, 8)}...${s.slice(-6)}` : s
}

function buildRow(r: SealRow): HTMLElement {
  const status = h('span', { class: 'seal-row-status mono', 'data-state': 'checking' }, 'checking')
  const copy = h('button', { type: 'button', class: 'icon-btn icon-btn--sm', 'aria-label': `Copy the salt for turn ${r.n}` }, icon('copy', 18))
  copy.addEventListener('click', () => {
    try {
      void navigator.clipboard?.writeText(r.seal.salt).catch(() => undefined)
    } catch {
      // clipboard can be blocked; the full salt is also in the reveal
    }
  })
  const row = h(
    'li',
    { class: 'seal-row', 'data-testid': 'seal-row' },
    h('span', { class: 'seal-row-turn mono' }, `Turn ${r.n}`),
    h('span', { class: 'seal-row-hash mono' }, `sealed · ${short(r.seal.commitment)}`),
    h('span', { class: 'seal-row-item' }, r.name),
    h('span', { class: 'seal-row-saltline' }, h('span', { class: 'seal-row-salt mono' }, middle(r.seal.salt)), copy),
    status,
  )
  verify(r.id, r.seal).then(
    (ok) => {
      status.textContent = ok ? 'verified' : 'mismatch'
      status.setAttribute('data-state', ok ? 'ok' : 'bad')
    },
    () => {
      status.textContent = 'mismatch'
      status.setAttribute('data-state', 'bad')
    },
  )
  return row
}

export function openVerifySheet(rows: SealRow[]): void {
  if (document.querySelector('.sheet-backdrop')) return
  const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null

  const close = h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Close' }, icon('close', 22))
  const list = h('ul', { class: 'seal-list' })
  for (const r of rows) list.append(buildRow(r))

  const sheet = h(
    'section',
    { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Check every seal' },
    h('div', { class: 'sheet-head' }, h('h2', { class: 'sheet-title' }, 'Check every seal'), close),
    h('p', { class: 'small' }, 'Each guess was locked with SHA-256 before you tapped. Recompute any of them yourself.'),
    h('p', { class: 'formula mono' }, 'sha256("<item id>:<salt>")'),
    list,
  )
  const backdrop = h('div', { class: 'sheet-backdrop' }, sheet)

  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') dismiss()
  }
  const dismiss = (): void => {
    document.removeEventListener('keydown', onKey)
    backdrop.remove()
    opener?.focus({ preventScroll: true })
  }
  close.addEventListener('click', dismiss)
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) dismiss()
  })
  document.addEventListener('keydown', onKey)
  document.body.append(backdrop)
  close.focus({ preventScroll: true })
}
