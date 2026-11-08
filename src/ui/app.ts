// App controller: wires the engine (Game, HabitModel, RemotePredictor) to the screens.
// With no VITE_API_BASE the app makes zero network calls and uses the on-device habit model only.
import type { Predictor, ScienceFact, Stats, TurnView } from '../contracts'
import { TURNS_PER_ROUND } from '../contracts'
import facts from '../data/facts.json'
import { getItem } from '../engine/catalog'
import { fingerprint } from '../engine/fingerprint'
import { Game } from '../engine/game'
import { HabitModel } from '../engine/habit'
import { RemotePredictor } from '../engine/remote'
import { short } from '../engine/seal'
import { chance, percentile, predictability } from '../engine/score'
import type { ScreenHandle } from './dom'
import { renderInterstitial } from './interstitial'
import { renderIntro } from './intro'
import type { IntroHandle } from './intro'
import type { Pip } from './parts'
import { renderResult } from './result'
import type { ResultProps } from './result'
import { renderRound } from './round'
import { renderScience } from './science'
import { initTheme } from './theme'
import { openVerifySheet } from './verify-sheet'
import type { SealRow } from './verify-sheet'

const FACTS = facts as ScienceFact[]

function readInt(raw: string | null, max: number): number | null {
  if (raw === null || !/^\d{1,10}$/.test(raw)) return null
  const n = Number(raw)
  return n <= max ? n : null
}

function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0]
}

function timezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

/** The first fact of the you, science and stakes groups, for the "why this matters" panel. */
function mattersFacts(): ScienceFact[] {
  const out: ScienceFact[] = []
  for (const g of ['you', 'science', 'stakes'] as const) {
    const f = FACTS.find((x) => x.group === g)
    if (f) out.push(f)
  }
  return out
}

export function startApp(root: HTMLElement): void {
  initTheme()

  const API: string = String(import.meta.env.VITE_API_BASE ?? '').replace(/\/+$/, '')
  const params = new URLSearchParams(window.location.search)
  // A challenge link carries ?seed=<int>&vs=<0-100>; the seed is used once, for the first game.
  const urlSeed = readInt(params.get('seed'), 4294967295)
  const urlVs = readInt(params.get('vs'), 100)
  let urlSeedUsed = false

  let game: Game | null = null
  let habit: HabitModel | null = null
  let gameSeed = 0
  let runId = ''
  let pips: Pip[] = new Array<Pip>(2 * TURNS_PER_ROUND).fill(null)
  let nextView: Promise<TurnView | null> | null = null
  let posted = false
  let starting = false
  let stats: Stats | null = null
  let statsRequested = false
  let current: ScreenHandle | null = null
  let lastResult: ResultProps | null = null

  function mount(handle: ScreenHandle): void {
    current?.destroy?.()
    current = handle
    root.replaceChildren(handle.el)
    window.scrollTo(0, 0)
    handle.el.focus({ preventScroll: true })
  }

  async function loadStats(): Promise<Stats | null> {
    if (!API) return null
    try {
      const ctl = new AbortController()
      const timer = window.setTimeout(() => ctl.abort(), 3000)
      const res = await fetch(`${API}/api/stats`, { signal: ctl.signal })
      window.clearTimeout(timer)
      if (!res.ok) return null
      const j: unknown = await res.json()
      const s = j as Partial<Stats> | null
      if (s && typeof s.n === 'number' && Array.isArray(s.histogram) && typeof s.mean === 'number') return s as Stats
    } catch {
      // the counter simply stays hidden
    }
    return null
  }

  async function postResult(body: unknown): Promise<void> {
    try {
      await fetch(`${API}/api/result`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        keepalive: true,
      })
    } catch {
      // anonymous score saving is best effort
    }
  }

  function sealRows(): SealRow[] {
    const g = game
    if (!g) return []
    const rows: SealRow[] = []
    // Only picked turns: the seal of a turn that has not been tapped yet is never listed.
    g.turns.forEach((t, i) => {
      const s = g.seals[i]
      if (s) rows.push({ n: i + 1, id: t.sealed, name: getItem(t.sealed).name, seal: s })
    })
    return rows
  }

  function showIntro(): void {
    const vs = urlSeed !== null && urlVs !== null && !urlSeedUsed ? urlVs : null
    const intro: IntroHandle = renderIntro({ vs, onPlay: () => begin(false), onHow: () => showScience(showIntro) })
    mount(intro)
    intro.setStats(stats)
    if (API && !statsRequested) {
      statsRequested = true
      void loadStats().then((s) => {
        stats = s
        intro.setStats(s)
      })
    }
  }

  function showScience(back: () => void): void {
    mount(renderScience(back))
  }

  function begin(replay: boolean): void {
    let seed: number
    if (!replay && urlSeed !== null && !urlSeedUsed) seed = urlSeed
    else seed = randomSeed()
    urlSeedUsed = true
    void play(seed)
  }

  async function play(seed: number): Promise<void> {
    if (starting) return
    starting = true
    try {
      const hm = new HabitModel()
      const session = crypto.randomUUID()
      const predictor: Predictor = API ? new RemotePredictor({ apiBase: API, habit: hm, session }) : hm
      const now = new Date()
      const g = new Game({ seed, predictor, ctx: { tz: timezone(), hour: now.getHours(), weekday: now.getDay() } })
      habit = hm
      game = g
      gameSeed = seed
      runId = crypto.randomUUID()
      pips = new Array<Pip>(2 * TURNS_PER_ROUND).fill(null)
      posted = false
      nextView = null
      const v = await g.next()
      if (v) showRound(v)
      else showIntro()
    } catch {
      showIntro()
    } finally {
      starting = false
    }
  }

  function showRound(view: TurnView): void {
    const g = game
    if (!g) {
      showIntro()
      return
    }
    const idx = (view.round - 1) * TURNS_PER_ROUND + view.index
    mount(
      renderRound({
        view,
        pips: pips.slice(),
        nextLabel: idx === 2 * TURNS_PER_ROUND - 1 ? 'See my result' : 'Next',
        pick: async (id) => {
          const r = await g.pick(id)
          pips[idx] = r.status
          // Deal and seal the next turn while the player reads this reveal.
          const p = g.next()
          p.catch(() => undefined)
          nextView = p
          return r
        },
        onNext: () => void advance(),
        onVerify: () => openVerifySheet(sealRows()),
      }),
    )
  }

  async function advance(): Promise<void> {
    const p = nextView
    if (!p) return
    try {
      const v = await p
      if (!v) showResult()
      else if (v.round === 2 && v.index === 0) showInterstitial(v)
      else showRound(v)
    } catch {
      showIntro()
    }
  }

  function showInterstitial(v: TurnView): void {
    mount(renderInterstitial(() => showRound(v)))
  }

  function showResult(): void {
    const g = game
    const hm = habit
    if (!g || !hm) {
      showIntro()
      return
    }
    const r = g.result(runId)
    if (API && !posted) {
      posted = true
      void postResult(r)
    }
    const ticks = chance(r)
    const pct = predictability(r)
    const first = g.seals[0]
    const props: ResultProps = {
      result: r,
      pct,
      ticks,
      chancePct: Math.round((100 * (ticks.called1 + ticks.calledDefy)) / (TURNS_PER_ROUND + r.defied)),
      percentile: percentile(pct, stats),
      traits: fingerprint(g.turns, hm),
      pips: pips.slice(),
      hash: first ? short(first.commitment) : '',
      seed: gameSeed,
      facts: mattersFacts(),
      onReplay: () => begin(true),
      onVerify: () => openVerifySheet(sealRows()),
      onHow: () =>
        showScience(() => {
          if (lastResult) mount(renderResult(lastResult))
          else showIntro()
        }),
    }
    lastResult = props
    mount(renderResult(props))
  }

  showIntro()
}
