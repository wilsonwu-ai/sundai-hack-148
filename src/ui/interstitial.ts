// Between the rounds: explains the shown guess and the second seal.
import { h, icon, screenEl } from './dom'
import type { ScreenHandle } from './dom'

export function renderInterstitial(onContinue: () => void): ScreenHandle {
  const el = screenEl('screen screen--inter')
  const go = h('button', { type: 'button', class: 'btn btn-primary btn-play', 'data-testid': 'interstitial-continue' }, "I'm ready")
  go.addEventListener('click', onContinue)
  el.append(
    h(
      'div',
      { class: 'inter-body' },
      h('h1', { class: 'inter-title' }, 'Round 2: Defy'),
      h('p', { class: 'inter-text' }, 'Now I show you my guess. Pick anything else, if you can.'),
      h('p', { class: 'inter-sub' }, "I'm also sealing a second guess: what you'll pick instead."),
      h('span', { class: 'badge badge--sample' }, icon('target', 14), "I predict you'll pick this"),
    ),
    go,
  )
  return { el }
}
