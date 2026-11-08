// Shared UI parts: the 12-pip receipt, status lines, fact cards.
import type { RevealStatus, ScienceFact } from '../contracts'
import { h } from './dom'

export type Pip = RevealStatus | null

export const STATUS_LINES: Record<RevealStatus, string> = {
  called: 'Sealed before you tapped.',
  missed: 'You surprised it.',
  calledDefy: "It knew you'd defy it, and how.",
  escaped: "It didn't see that coming.",
  obeyed: 'You picked its guess.',
}

function pipClass(p: Pip, index: number): string {
  const base = p === 'called' || p === 'calledDefy' ? 'pip--called' : p === 'missed' || p === 'escaped' ? 'pip--missed' : p === 'obeyed' ? 'pip--obeyed' : 'pip--todo'
  return `pip ${base}${index === 6 ? ' pip--gap' : ''}`
}

/** 6 + 6 pips with a gap between the rounds. Filled vermilion = called, blue ring = missed or escaped, slashed grey ring = obeyed. */
export function renderPips(states: Pip[], large = false): HTMLElement {
  const wrap = h('div', { class: large ? 'pips pips--lg' : 'pips', role: 'img', 'aria-label': 'Your receipt: one mark for each of the twelve turns' })
  states.forEach((s, i) => wrap.append(h('span', { class: pipClass(s, i) })))
  return wrap
}

export function updatePip(wrap: HTMLElement, index: number, s: Pip): void {
  const el = wrap.children[index]
  if (el) el.className = pipClass(s, index)
}

/** One fact: the big stat (when there is one), the line, and the source as a link. */
export function factCard(f: ScienceFact): HTMLElement {
  return h(
    'article',
    { class: 'fact' },
    f.stat ? h('p', { class: 'fact-stat' }, f.stat) : null,
    h('p', { class: 'fact-line' }, f.line),
    h('a', { class: 'fact-src', href: f.url, target: '_blank', rel: 'noopener noreferrer' }, f.source),
  )
}
