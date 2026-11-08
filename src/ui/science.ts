// "How it works": three steps, the privacy note, and the verified facts grouped you / science / machine / stakes.
import type { ScienceFact } from '../contracts'
import { FOOTER_LINE } from '../contracts'
import facts from '../data/facts.json'
import { h, icon, screenEl } from './dom'
import type { ScreenHandle } from './dom'
import { factCard } from './parts'
import { themeButton } from './theme'

const FACTS = facts as ScienceFact[]

const GROUPS: { id: ScienceFact['group']; title: string }[] = [
  { id: 'you', title: 'You' },
  { id: 'science', title: 'The science' },
  { id: 'machine', title: 'The machine' },
  { id: 'stakes', title: 'The stakes' },
]

export function renderScience(onBack: () => void): ScreenHandle {
  const el = screenEl('screen screen--science')
  const back = h('button', { type: 'button', class: 'link-btn' }, icon('chevron', 18), 'Back')
  back.addEventListener('click', onBack)

  const steps = h(
    'ol',
    { class: 'steps' },
    h(
      'li',
      {},
      h('strong', {}, 'It watches.'),
      ' Every tap teaches a small on-device model your taste and your habits. With the live model on, BehaviorGPT-v4 ranks the cards from your taps too, zero-shot: it was never trained on these 96 items.',
    ),
    h('li', {}, h('strong', {}, 'It seals.'), ' Before each tap it locks its guess with a hash you can check.'),
    h('li', {}, h('strong', {}, 'It dares.'), ' In round 2 it shows you its guess, then seals a second guess for what you will pick instead.'),
  )

  el.append(
    h('div', { class: 'topbar' }, back, h('div', { class: 'topbar-actions' }, themeButton())),
    h('h1', { class: 'page-title' }, 'How it works'),
    steps,
    h(
      'p',
      { class: 'privacy' },
      'Your taps stay in your browser. When the live model is on, each turn sends only item ids, your timezone and a random session id to our server, and your final counts are saved anonymously for the histogram. No IP address is ever written to storage.',
    ),
  )

  for (const g of GROUPS) {
    const items = FACTS.filter((f) => f.group === g.id)
    if (items.length === 0) continue
    el.append(h('section', { class: 'fact-group' }, h('h2', { class: 'group-title mono' }, g.title), ...items.map(factCard)))
  }

  el.append(h('p', { class: 'footer' }, h('span', {}, FOOTER_LINE), ' ', h('span', {}, "Built at Sundai Hack 148 with Unbox AI's BehaviorGPT.")))
  return { el }
}
