// Result screen: headline, stat rows with a printed chance tick, predictability numeral, traits, receipt, share actions,
// the verify entry point and the why-this-matters panel.
import type { RunResult, ScienceFact, Trait } from '../contracts'
import { FOOTER_LINE, TURNS_PER_ROUND } from '../contracts'
import { h, put, screenEl } from './dom'
import type { ScreenHandle } from './dom'
import { factCard, renderPips } from './parts'
import type { Pip } from './parts'
import { loadCardFonts, renderStoryCard } from './share-card'

export interface ResultProps {
  result: RunResult
  /** integer 0-100 */
  pct: number
  /** the chance baselines: called1 (1.5) and calledDefy (defied / 3) */
  ticks: { called1: number; calledDefy: number }
  /** integer chance of the same ratio */
  chancePct: number
  /** only when the backend reported n >= 20 */
  percentile: number | null
  traits: Trait[]
  pips: Pip[]
  /** first 8 hex of turn 1's commitment */
  hash: string
  seed: number
  facts: ScienceFact[]
  onReplay: () => void
  onVerify: () => void
  onHow: () => void
}

function headlineLines(r: RunResult): [string, string] {
  const first = `It called ${r.called1} of my ${TURNS_PER_ROUND} picks.`
  const second =
    r.defied === 0
      ? `I never defied it. It called ${r.called1} of ${TURNS_PER_ROUND} anyway.`
      : `When I tried to defy it, it still called ${r.calledDefy} of ${r.defied}.`
  return [first, second]
}

function engineLine(r: RunResult): string {
  return r.engine === 'behaviorgpt-v4'
    ? 'Predicted by BehaviorGPT-v4 (Unbox AI) plus an on-device habit model'
    : 'Predicted by an on-device habit model'
}

function siteUrl(): string {
  return `${window.location.origin}${window.location.pathname}`
}

function statRow(text: string, value: number, max: number, tick: number | null): HTMLElement {
  const bar = h(
    'div',
    { class: 'bar' },
    h('div', { class: 'bar-fill' }),
    tick !== null ? h('div', { class: 'bar-tick' }, h('span', { class: 'bar-tick-label mono' }, 'chance')) : null,
  )
  bar.style.setProperty('--v', `${max > 0 ? Math.min(100, (value / max) * 100) : 0}%`)
  if (tick !== null) bar.style.setProperty('--t', `${max > 0 ? Math.min(100, (tick / max) * 100) : 0}%`)
  return h('div', { class: 'stat-row' }, h('p', { class: 'stat-text' }, text), bar)
}

export function renderResult(p: ResultProps): ScreenHandle {
  const r = p.result
  const el = screenEl('screen screen--result')
  el.setAttribute('data-testid', 'result')
  const [l1, l2] = headlineLines(r)

  const headline = h('h1', { class: 'result-headline', 'data-testid': 'result-headline' }, h('span', {}, l1), ' ', h('span', {}, l2))

  const rows = h(
    'section',
    { class: 'stats' },
    statRow(`Round 1: called ${r.called1} of ${TURNS_PER_ROUND} · chance ${p.ticks.called1.toFixed(1)}`, r.called1, TURNS_PER_ROUND, p.ticks.called1),
    statRow(
      `Round 2: called ${r.calledDefy} of ${r.defied} defiances · chance ${p.ticks.calledDefy.toFixed(1)}`,
      r.calledDefy,
      r.defied,
      p.ticks.calledDefy,
    ),
    h('p', { class: 'stat-text stat-obeyed' }, `You obeyed ${r.obeyed} of ${TURNS_PER_ROUND}`),
  )

  const numeral = h(
    'section',
    { class: 'predictability' },
    h('p', { class: 'numeral' }, `${p.pct}%`),
    h(
      'div',
      { class: 'numeral-side' },
      h('p', { class: 'numeral-label mono' }, 'predictable'),
      h('p', { class: 'numeral-chance mono', 'data-testid': 'chance' }, `chance: ${p.chancePct}%`),
    ),
  )

  const percentile = p.percentile !== null ? h('p', { class: 'percentile' }, `More predictable than ${p.percentile}% of players`) : null

  const traits =
    p.traits.length > 0
      ? h(
          'section',
          { class: 'traits' },
          h('h2', { class: 'group-title mono' }, 'Your pattern'),
          h('div', { class: 'chip-row' }, ...p.traits.map((t) => h('span', { class: 'chip chip--trait mono' }, t.label))),
        )
      : null

  // share card preview, hidden until "Share my card"
  const img = h('img', { class: 'card-preview', 'data-testid': 'card-preview', alt: 'Your DEFY result card' })
  const share = h('button', { type: 'button', class: 'btn', 'data-testid': 'share' }, 'Share image')
  const toast = h('p', { class: 'toast', role: 'status', 'aria-live': 'polite' })
  const preview = h('section', { class: 'preview' }, img, share)
  preview.hidden = true

  let canvas: HTMLCanvasElement | null = null
  const say = (msg: string): void => {
    toast.textContent = msg
  }
  const shareText = (): string =>
    r.defied === 0
      ? `It called ${r.called1} of my ${TURNS_PER_ROUND} picks. Can you defy it? ${siteUrl()}`
      : `It called ${r.called1} of my ${TURNS_PER_ROUND} picks and ${r.calledDefy} of my ${r.defied} defiances. Can you defy it? ${siteUrl()}`

  const makeCard = async (): Promise<void> => {
    try {
      await loadCardFonts()
      canvas = renderStoryCard({
        headline: [l1, l2],
        pips: p.pips,
        pct: p.pct,
        chancePct: p.chancePct,
        traits: p.traits.map((t) => t.label),
        showCardLine: r.calledDefy >= 1,
        hash: p.hash,
        engineLine: engineLine(r),
      })
      img.src = canvas.toDataURL('image/png')
      preview.hidden = false
      preview.scrollIntoView({ block: 'center', behavior: 'auto' })
    } catch {
      say('The card could not be drawn here.')
    }
  }

  const download = (blob: Blob): void => {
    const url = URL.createObjectURL(blob)
    const a = h('a', { href: url, download: 'defy-card.png' })
    document.body.append(a)
    a.click()
    a.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 4000)
    say('Saved the image.')
  }

  const shareImage = async (): Promise<void> => {
    const cv = canvas
    if (!cv) return
    const blob = await new Promise<Blob | null>((res) => cv.toBlob(res, 'image/png'))
    if (!blob) return
    const file = new File([blob], 'defy-card.png', { type: 'image/png' })
    try {
      if (typeof navigator.canShare === 'function' && typeof navigator.share === 'function' && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text: shareText() })
        return
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
    }
    download(blob)
  }

  const challenge = async (): Promise<void> => {
    const text = `Same 12 deals. I was ${p.pct}% predictable. Beat that. ${siteUrl()}?seed=${p.seed}&vs=${p.pct}`
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ text })
        return
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
    }
    try {
      await navigator.clipboard.writeText(text)
      say('Link copied.')
    } catch {
      say(text)
    }
  }

  share.addEventListener('click', () => void shareImage())

  const verifyBtn = h('button', { type: 'button', class: 'btn', 'data-testid': 'verify-open' }, 'Check every seal')
  verifyBtn.addEventListener('click', p.onVerify)

  const how = h('button', { type: 'button', class: 'link-btn' }, 'How it works')
  how.addEventListener('click', p.onHow)

  const matters = h(
    'section',
    { class: 'matters' },
    h('h2', { class: 'group-title mono' }, 'Why this matters'),
    ...p.facts.map((f) => factCard(f)),
    how,
  )

  const makeBtn = h('button', { type: 'button', class: 'btn btn-primary', 'data-testid': 'make-card' }, 'Share my card')
  makeBtn.addEventListener('click', () => void makeCard())
  const replayBtn = h('button', { type: 'button', class: 'btn', 'data-testid': 'replay' }, 'Play again')
  replayBtn.addEventListener('click', p.onReplay)
  const challengeBtn = h('button', { type: 'button', class: 'btn', 'data-testid': 'challenge' }, 'Challenge a friend')
  challengeBtn.addEventListener('click', () => void challenge())

  put(
    el,
    headline,
    rows,
    numeral,
    percentile,
    traits,
    h('section', { class: 'receipt' }, renderPips(p.pips, true)),
    preview,
    h(
      'section',
      { class: 'verify-cta' },
      verifyBtn,
      h('p', { class: 'small' }, 'Each guess was locked with SHA-256 before you tapped. Recompute any of them yourself.'),
    ),
    matters,
    h(
      'footer',
      { class: 'result-foot' },
      h('p', { class: 'footer' }, h('span', {}, FOOTER_LINE), ' ', h('span', {}, "Built at Sundai Hack 148 with Unbox AI's BehaviorGPT.")),
      h('p', { class: 'engine mono', 'data-testid': 'engine' }, engineLine(r)),
    ),
    h('div', { class: 'action-bar' }, toast, h('div', { class: 'action-row' }, makeBtn, replayBtn, challengeBtn)),
  )

  return { el }
}
