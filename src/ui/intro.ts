// Intro screen: wordmark, hook, rules, a static ghost demo (emoji only, never item names), Play, live counter.
import type { Stats } from '../contracts'
import { FOOTER_LINE, HOOK } from '../contracts'
import { h, icon, put, screenEl } from './dom'
import type { ScreenHandle } from './dom'
import { themeButton } from './theme'

export interface IntroOpts {
  /** challenge link: the friend's predictability, or null */
  vs: number | null
  /** true when results are saved to the live histogram (VITE_API_BASE is set) */
  live?: boolean
  onPlay: () => void
  onHow: () => void
}

/** The live game's address, as printed beside the QR. public/qr.svg encodes the same URL (scripts/make_qr.sh). */
const PLAY_LABEL = 'wilsonwu-ai.github.io/sundai-hack-148'

/** Desktop only (CSS): a QR so a room watching a shared screen can play along on their phones. */
function playAlong(live: boolean): HTMLElement {
  return h(
    'aside',
    { class: 'play-along', 'data-testid': 'play-along', 'aria-label': 'Play along on your phone' },
    h(
      'span',
      { class: 'play-along-tile' },
      h('img', { class: 'play-along-qr', src: `${import.meta.env.BASE_URL}qr.svg`, alt: `QR code for ${PLAY_LABEL}`, width: '168', height: '168' }),
    ),
    h('p', { class: 'group-title mono' }, 'Play along'),
    // lowercase on purpose: GitHub Pages paths are case-sensitive, so the typed URL must match
    h('p', { class: 'play-along-url mono' }, h('span', {}, 'wilsonwu-ai.github.io/'), h('wbr', {}), h('span', {}, 'sundai-hack-148')),
    h('p', { class: 'small' }, live ? 'Scan to play on your phone. Everyone who finishes joins the live count.' : 'Scan to play on your phone.'),
  )
}

export interface IntroHandle extends ScreenHandle {
  setStats: (s: Stats | null) => void
}

function ghostDemo(): HTMLElement {
  const emojis = ['\u{1F56F}\u{FE0F}', '\u{1F3A7}', '\u{1F950}', '\u{1F3D4}\u{FE0F}']
  const cards = emojis.map((e, i) =>
    h(
      'span',
      { class: i === 1 ? 'ghost-card is-shown' : 'ghost-card' },
      h('span', { class: 'ghost-emoji' }, e),
      i === 1 ? h('span', { class: 'ghost-sticker' }, icon('target', 14)) : null,
    ),
  )
  return h(
    'div',
    { class: 'ghost', 'aria-hidden': 'true' },
    h('span', { class: 'ghost-seal' }, h('span', { class: 'ghost-plate' }, icon('lock', 16), h('span', { class: 'ghost-bars' }))),
    h('span', { class: 'ghost-grid' }, ...cards),
  )
}

export function renderIntro(o: IntroOpts): IntroHandle {
  const el = screenEl('screen screen--intro')

  const how = h('button', { type: 'button', class: 'link-btn' }, 'How it works')
  how.addEventListener('click', o.onHow)

  const play = h('button', { type: 'button', class: 'btn btn-primary btn-play', 'data-testid': 'intro-play' }, 'Play')
  play.addEventListener('click', o.onPlay)

  const counter = h('p', { class: 'counter' })

  put(
    el,
    h('div', { class: 'topbar' }, h('span', { class: 'wordmark-sm' }, 'DEFY'), h('div', { class: 'topbar-actions' }, how, themeButton())),
    h('h1', { class: 'wordmark' }, 'DEFY'),
    h('p', { class: 'hook' }, HOOK),
    h('p', { class: 'rules' }, '12 taps. Before each one, an AI seals its guess. Then it shows you its guess and dares you to defy it.'),
    ghostDemo(),
    o.vs !== null ? h('p', { class: 'banner' }, `A friend was ${o.vs}% predictable on these exact 12 deals. Beat that.`) : null,
    play,
    counter,
    h('p', { class: 'footer' }, h('span', {}, FOOTER_LINE), ' ', h('span', {}, "Built at Sundai Hack 148 with Unbox AI's BehaviorGPT.")),
    playAlong(o.live === true),
  )

  return {
    el,
    setStats(s) {
      counter.textContent = s && s.n >= 20 ? `${s.n} people have tried to defy it` : ''
    },
  }
}
