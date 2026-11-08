// The round screen, shared by Round 1 and Round 2. One turn per instance: the app builds a fresh one for every turn.
// The sealed item is never in the DOM before the tap: the view carries only the commitment, and the revealed face is
// created at the moment of the flip.
import type { Reveal, RevealStatus, TurnView, Item } from '../contracts'
import { REVEAL_WORDS, TURNS_PER_ROUND } from '../contracts'
import { getItem } from '../engine/catalog'
import { short } from '../engine/seal'
import { h, icon, reduced, screenEl } from './dom'
import type { ScreenHandle } from './dom'
import { renderPips, STATUS_LINES, updatePip } from './parts'
import type { Pip } from './parts'

export interface RoundOpts {
  view: TurnView
  /** the 12 pip states as they stand before this turn */
  pips: Pip[]
  /** commits the tap in the game and returns the reveal */
  pick: (id: string) => Promise<Reveal>
  nextLabel: string
  onNext: () => void
  onVerify: () => void
}

type Tone = 'model' | 'you' | 'muted'

function toneOf(status: RevealStatus): Tone {
  return status === 'called' || status === 'calledDefy' ? 'model' : status === 'obeyed' ? 'muted' : 'you'
}

export function renderRound(o: RoundOpts): ScreenHandle {
  const v = o.view
  const timers: number[] = []
  let locked = false
  const later = (fn: () => void, ms: number): void => {
    timers.push(window.setTimeout(fn, ms))
  }

  const label = v.round === 1 ? 'Round 1 · Blind' : 'Round 2 · Defy'
  const prompt = v.round === 1 ? "Pick the one you'd actually want." : 'Pick anything but my guess. If you can.'
  const caption = v.round === 1 ? 'My guess. Locked before you tap.' : 'My guess if you defy. Locked before you tap.'
  const pipIndex = (v.round - 1) * TURNS_PER_ROUND + v.index

  const el = screenEl('screen screen--round')
  const pips = renderPips(o.pips)

  // The seal: only the commitment, never the item.
  const strip = h(
    'div',
    { class: 'seal', 'data-testid': 'sealed-card' },
    h(
      'div',
      { class: 'seal-plate' },
      icon('lock', 22),
      h('span', { class: 'seal-text' }, 'sealed · ', h('span', { 'data-testid': 'sealed-commit' }, short(v.commitment))),
    ),
  )

  const cards = v.cards.map((item, i) => {
    const shown = v.shown === item.id
    const kids: (Node | null)[] = [
      h(
        'span',
        { class: 'card-face' },
        h('span', { class: 'card-emoji', 'aria-hidden': 'true' }, item.emoji),
        h('span', { class: 'card-name' }, item.name),
        h('span', { class: 'chip mono' }, item.vibe),
      ),
    ]
    if (shown) {
      kids.push(
        h('span', { class: 'badge', 'data-testid': 'predict-badge' }, icon('target', 14), "I predict you'll pick this"),
        h('span', { class: 'br br-tl', 'aria-hidden': 'true' }),
        h('span', { class: 'br br-tr', 'aria-hidden': 'true' }),
        h('span', { class: 'br br-bl', 'aria-hidden': 'true' }),
        h('span', { class: 'br br-br', 'aria-hidden': 'true' }),
      )
    }
    const btn = h(
      'button',
      {
        type: 'button',
        class: shown ? 'card is-shown' : 'card',
        'data-testid': 'card',
        'data-pos': String(i),
        'data-id': item.id,
        'aria-label': shown ? `${item.name}, ${item.vibe}. I predict you'll pick this` : `${item.name}, ${item.vibe}`,
      },
      ...kids,
    )
    btn.addEventListener('click', () => void choose(btn, item.id))
    return btn
  })
  const grid = h('div', { class: 'round-grid' }, ...cards)

  const verdict = h('div', { class: 'verdict', role: 'status', 'aria-live': 'polite' })

  const buildFace = (rev: Reveal, item: Item, status: RevealStatus): HTMLElement => {
    const tone = toneOf(status)
    const iconName = tone === 'model' ? 'target' : tone === 'muted' ? 'slash' : 'ring'
    const verifyBtn = h('button', { type: 'button', class: 'link-btn link-btn--sm' }, 'verify')
    verifyBtn.addEventListener('click', o.onVerify)
    return h(
      'div',
      { class: 'reveal-face' },
      h('span', { class: 'reveal-emoji', 'aria-hidden': 'true' }, item.emoji),
      h(
        'div',
        { class: 'reveal-body' },
        h('span', { class: 'reveal-name', 'data-testid': 'reveal-name' }, item.name),
        h('span', { class: `stamp stamp--${tone}`, 'data-testid': 'reveal' }, icon(iconName, 16), REVEAL_WORDS[status]),
        h(
          'span',
          { class: 'reveal-meta mono' },
          h('span', { class: 'reveal-id', 'data-testid': 'reveal-id' }, rev.turn.sealed),
          h('span', { class: 'reveal-salt', 'data-testid': 'reveal-salt' }, rev.seal.salt),
        ),
      ),
      verifyBtn,
    )
  }

  const flip = (rev: Reveal, item: Item, motion: boolean): void => {
    const status = rev.status
    const swap = (): void => {
      strip.replaceChildren(buildFace(rev, item, status))
      strip.classList.add('is-revealed')
      if (status === 'calledDefy') strip.classList.add('thump')
      if (status === 'escaped') strip.classList.add('pulse')
      if (motion && typeof navigator.vibrate === 'function') navigator.vibrate(15)

      const announce = status === 'obeyed' ? 'You obeyed. You picked its guess.' : `${REVEAL_WORDS[status]}. It sealed ${item.name}.`
      const next = h('button', { type: 'button', class: 'btn btn-primary btn-next', 'data-testid': 'next' }, o.nextLabel)
      next.addEventListener('click', () => {
        next.disabled = true
        o.onNext()
      })
      verdict.replaceChildren(
        h('span', { class: 'sr-only' }, announce),
        h('p', { class: 'verdict-line', 'aria-hidden': 'true' }, STATUS_LINES[status]),
        next,
      )
      next.focus({ preventScroll: true })
    }
    if (motion) {
      strip.classList.add('flip-out')
      later(() => {
        strip.classList.remove('flip-out')
        strip.classList.add('flip-in')
        swap()
      }, 140)
    } else {
      strip.classList.add('fade-in')
      swap()
    }
  }

  const choose = async (btn: HTMLButtonElement, id: string): Promise<void> => {
    if (locked) return
    locked = true
    for (const c of cards) {
      c.classList.add('is-locked')
      if (c !== btn) c.classList.add('is-dim')
    }
    btn.classList.add('is-picked')
    let rev: Reveal
    try {
      rev = await o.pick(id)
    } catch {
      locked = false
      for (const c of cards) c.classList.remove('is-locked', 'is-dim')
      btn.classList.remove('is-picked')
      return
    }
    const item = v.cards.find((c) => c.id === rev.turn.sealed) ?? getItem(rev.turn.sealed)
    updatePip(pips, pipIndex, rev.status)
    const motion = !reduced()
    const shownCard = cards.find((c) => c.classList.contains('is-shown'))
    if (shownCard) shownCard.classList.add(rev.status === 'obeyed' ? 'is-obeyed' : 'is-defied')
    later(() => flip(rev, item, motion), motion ? (shownCard && rev.status !== 'obeyed' ? 200 : 60) : 0)
  }

  const onKey = (e: KeyboardEvent): void => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.key.length !== 1) return
    const i = '1234'.indexOf(e.key)
    if (i < 0 || locked || document.querySelector('.sheet-backdrop')) return
    e.preventDefault()
    cards[i]?.click()
  }
  document.addEventListener('keydown', onKey)

  el.append(
    h(
      'header',
      { class: 'round-head' },
      h(
        'div',
        { class: 'round-row' },
        h('span', { class: 'round-label mono', 'data-testid': 'round-label' }, label),
        h('span', { class: 'turn-counter mono', 'data-testid': 'turn-counter' }, `${v.index + 1} / ${TURNS_PER_ROUND}`),
      ),
      pips,
    ),
    h('p', { class: 'prompt' }, prompt),
    strip,
    h('p', { class: 'seal-caption' }, caption),
    grid,
    verdict,
  )

  return {
    el,
    destroy() {
      document.removeEventListener('keydown', onKey)
      for (const t of timers) window.clearTimeout(t)
    },
  }
}
