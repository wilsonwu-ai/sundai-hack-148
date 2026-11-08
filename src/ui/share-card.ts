// Client-side share cards. Always the dark tokens, whatever theme the page is in.
// Story card 1080x1350 (the shared PNG and the card-preview image), link card 1200x630 (og.png and the Sundai thumbnail).
import { CARD_LINE, HOOK } from '../contracts'
import type { RevealStatus } from '../contracts'

const C = {
  bg: '#0D0E11',
  surface: '#171920',
  surface2: '#20232C',
  lineSubtle: '#2A2D38',
  lineStrong: '#686E80',
  text: '#F4F1EA',
  muted: '#A9ACB5',
  model: '#FF5A36',
  onModel: '#0D0E11',
  you: '#7CC4FF',
  hatch: '#2B2F3A',
}
const SYS = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
const MONO = '"JetBrains Mono", ui-monospace, Menlo, monospace'
const DISPLAY = '"Big Shoulders Display", Impact, "Arial Narrow", sans-serif'
const EMOJI = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif'

export const SITE_LABEL = 'wilsonwu-ai.github.io/sundai-hack-148'
/** Share card dare (copy deck section 8): the challenge text, so a stranger gets a number to beat. */
export const shareDare = (pct: number): string => `I was ${pct}% predictable. Beat that.`

/** Await this before drawing any card, otherwise the canvas falls back to system fonts. */
export async function loadCardFonts(): Promise<void> {
  try {
    await Promise.all([
      document.fonts.load('800 120px "Big Shoulders Display"', 'DEFY0123456789%'),
      document.fonts.load('700 20px "JetBrains Mono"', 'sealed · 0123456789abcdef:%'),
      document.fonts.load('400 16px "JetBrains Mono"', 'Predicted by sealed'),
    ])
    await document.fonts.ready
  } catch {
    // fall back to the system fonts rather than block the share flow
  }
}

export interface StoryCardData {
  /** headline paragraphs, one sentence each */
  headline: string[]
  /** 12 pip states */
  pips: (RevealStatus | null)[]
  pct: number
  chancePct: number
  traits: string[]
  showCardLine: boolean
  /** first 8 hex of turn 1's commitment */
  hash: string
  engineLine: string
}

function make(w: number, h: number): { c: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('canvas unavailable')
  return { c, ctx }
}

/** Dark field plus a fixed-seed film grain (also keeps the PNG from collapsing to a few kB). */
function paintBackground(ctx: CanvasRenderingContext2D, w: number, h: number, specks: number): void {
  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, w, h)
  let s = 0x9e3779b9
  const rnd = (): number => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
  for (let i = 0; i < specks; i++) {
    const a = 0.025 + Math.floor(rnd() * 4) * 0.018
    ctx.fillStyle = `rgba(244,241,234,${a.toFixed(3)})`
    ctx.fillRect(Math.floor(rnd() * w), Math.floor(rnd() * h), 2, 2)
  }
}

function hatch(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  ctx.strokeStyle = C.hatch
  ctx.lineWidth = 8
  ctx.beginPath()
  for (let k = -h; k < w; k += 22) {
    ctx.moveTo(x + k, y + h)
    ctx.lineTo(x + k + h, y)
  }
  ctx.stroke()
  ctx.restore()
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const t = line ? `${line} ${w}` : w
    if (ctx.measureText(t).width > max && line) {
      lines.push(line)
      line = w
    } else {
      line = t
    }
  }
  if (line) lines.push(line)
  return lines
}

function drawPip(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, state: RevealStatus | null): void {
  ctx.lineWidth = Math.max(4, r * 0.22)
  if (state === 'called' || state === 'calledDefy') {
    ctx.fillStyle = C.model
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fill()
  } else if (state === 'missed' || state === 'escaped') {
    ctx.strokeStyle = C.you
    ctx.beginPath()
    ctx.arc(cx, cy, r - ctx.lineWidth / 2, 0, Math.PI * 2)
    ctx.stroke()
  } else if (state === 'obeyed') {
    ctx.strokeStyle = C.muted
    ctx.beginPath()
    ctx.arc(cx, cy, r - ctx.lineWidth / 2, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(cx - r * 0.62, cy + r * 0.62)
    ctx.lineTo(cx + r * 0.62, cy - r * 0.62)
    ctx.stroke()
  } else {
    ctx.fillStyle = C.lineStrong
    ctx.beginPath()
    ctx.arc(cx, cy, r * 0.22, 0, Math.PI * 2)
    ctx.fill()
  }
}

function brackets(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, len: number): void {
  ctx.strokeStyle = C.model
  ctx.lineWidth = 5
  const o = 8
  const corner = (cx: number, cy: number, dx: number, dy: number): void => {
    ctx.beginPath()
    ctx.moveTo(cx + dx * len, cy)
    ctx.lineTo(cx, cy)
    ctx.lineTo(cx, cy + dy * len)
    ctx.stroke()
  }
  corner(x - o, y - o, 1, 1)
  corner(x + w + o, y - o, -1, 1)
  corner(x - o, y + h + o, 1, -1)
  corner(x + w + o, y + h + o, -1, -1)
}

function plate(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = C.surface2
  ctx.fillRect(x, y, w, h)
  ctx.strokeStyle = C.lineStrong
  ctx.lineWidth = 2
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2)
}

export function renderStoryCard(d: StoryCardData): HTMLCanvasElement {
  const W = 1080
  const H = 1350
  const { c, ctx } = make(W, H)
  paintBackground(ctx, W, H, 7000)
  ctx.fillStyle = C.model
  ctx.fillRect(0, 0, W, 10)

  // brand row
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = C.text
  ctx.font = `800 64px ${DISPLAY}`
  ctx.fillText('DEFY', 72, 130)
  const ribbon = `sealed · ${d.hash}`
  ctx.font = `700 28px ${MONO}`
  const rw = Math.ceil(ctx.measureText(ribbon).width) + 48
  const rx = W - 72 - rw
  plate(ctx, rx, 92, rw, 52)
  ctx.fillStyle = C.text
  ctx.fillText(ribbon, rx + 24, 128)

  // headline, shrunk until it fits the block (68 down to a 52 floor)
  ctx.textBaseline = 'top'
  let size = 68
  let paras: string[][] = []
  for (;;) {
    ctx.font = `700 ${size}px ${SYS}`
    paras = d.headline.map((p) => wrap(ctx, p, W - 144))
    const count = paras.reduce((n, p) => n + p.length, 0)
    const lh = Math.round((size * 76) / 68)
    if (count * lh + (paras.length - 1) * 16 <= 380 || size <= 52) break
    size -= 2
  }
  const lh = Math.round((size * 76) / 68)
  ctx.fillStyle = C.text
  let y = 200
  for (const lines of paras) {
    for (const line of lines) {
      ctx.fillText(line, 72, y)
      y += lh
    }
    y += 16
  }

  // receipt: pips on a plate over a hatched band
  hatch(ctx, 0, 600, W, 116)
  plate(ctx, 48, 616, W - 96, 84)
  const groupW = 6 * 56 + 5 * 16
  const startX = (W - (groupW * 2 + 56)) / 2
  for (let i = 0; i < 12; i++) {
    const cx = i < 6 ? startX + 28 + i * 72 : startX + groupW + 56 + 28 + (i - 6) * 72
    drawPip(ctx, cx, 658, 28, d.pips[i] ?? null)
  }

  // predictability numeral and the chance baseline
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = C.model
  ctx.font = `800 240px ${DISPLAY}`
  const num = `${d.pct}%`
  ctx.fillText(num, 72, 960)
  const nw = ctx.measureText(num).width
  ctx.font = `700 34px ${MONO}`
  ctx.fillStyle = C.text
  ctx.fillText('PREDICTABLE', 72 + nw + 36, 872)
  ctx.fillStyle = C.muted
  ctx.fillText(`chance: ${d.chancePct}%`, 72 + nw + 36, 922)

  // trait chips
  ctx.font = `700 28px ${MONO}`
  let cx = 72
  for (const t of d.traits) {
    const label = t.toUpperCase()
    const w = Math.ceil(ctx.measureText(label).width) + 40
    if (cx + w > W - 72) break
    ctx.strokeStyle = C.lineStrong
    ctx.lineWidth = 2
    ctx.strokeRect(cx + 1, 1001, w - 2, 50)
    ctx.fillStyle = C.text
    ctx.fillText(label, cx + 20, 1036)
    cx += w + 14
  }

  // the card line, only when it called at least one defiance
  if (d.showCardLine) {
    ctx.font = `italic 400 36px ${SYS}`
    ctx.fillStyle = C.text
    ctx.textBaseline = 'top'
    let ly = 1092
    for (const line of wrap(ctx, CARD_LINE, W - 144).slice(0, 2)) {
      ctx.fillText(line, 72, ly)
      ly += 44
    }
    ctx.textBaseline = 'alphabetic'
  }

  // footer: the dare in the "you" voice, a URL that survives a thumbnail, then the small print
  ctx.textAlign = 'left'
  ctx.font = `700 44px ${SYS}`
  ctx.fillStyle = C.you
  ctx.fillText(shareDare(d.pct), 72, 1226)
  ctx.font = `700 34px ${MONO}`
  ctx.fillStyle = C.text
  ctx.fillText(SITE_LABEL, 72, 1282)
  ctx.font = `400 20px ${MONO}`
  ctx.fillStyle = C.muted
  ctx.fillText(d.engineLine, 72, 1320)
  ctx.textAlign = 'right'
  ctx.fillText('A toy, not a study.', W - 72, 1320)
  ctx.textAlign = 'left'
  return c
}

/** The 1200x630 link card: wordmark and tagline on the left, a 2x2 motif with one badged card under a seal strip on the right. */
export function renderLinkCard(): HTMLCanvasElement {
  const W = 1200
  const H = 630
  const { c, ctx } = make(W, H)
  paintBackground(ctx, W, H, 2400)
  ctx.fillStyle = C.model
  ctx.fillRect(0, 0, W, 10)

  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = C.text
  ctx.font = `800 230px ${DISPLAY}`
  ctx.fillText('DEFY', 68, 292)
  ctx.font = `700 56px ${SYS}`
  const lines = wrap(ctx, 'It already guessed your next tap.', 540)
  let y = 366
  for (const line of lines) {
    ctx.fillText(line, 72, y)
    y += 64
  }
  ctx.font = `700 22px ${MONO}`
  ctx.fillStyle = C.muted
  ctx.fillText(HOOK, 72, 568)

  // motif: seal strip across the top, then 2x2 cards
  const mx = 700
  const mw = 428
  hatch(ctx, mx, 56, mw, 70)
  const label = 'sealed · 3f9a01c2'
  ctx.font = `700 22px ${MONO}`
  const pw = Math.ceil(ctx.measureText(label).width) + 64
  plate(ctx, mx + (mw - pw) / 2, 66, pw, 50)
  ctx.fillStyle = C.text
  ctx.textAlign = 'center'
  ctx.fillText(label, mx + mw / 2 + 12, 98)
  // padlock
  const lx = mx + (mw - pw) / 2 + 18
  ctx.fillStyle = C.text
  ctx.fillRect(lx, 90, 18, 14)
  ctx.strokeStyle = C.text
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(lx + 9, 90, 6, Math.PI, 0)
  ctx.stroke()

  const emojis = ['\u{1F56F}\u{FE0F}', '\u{1F3A7}', '\u{1F950}', '\u{1F3D4}\u{FE0F}']
  const cw = 206
  const ch = 196
  for (let i = 0; i < 4; i++) {
    const x = mx + (i % 2) * (cw + 16)
    const cy = 156 + Math.floor(i / 2) * (ch + 16)
    ctx.fillStyle = C.surface
    ctx.fillRect(x, cy, cw, ch)
    ctx.strokeStyle = i === 1 ? C.model : C.lineStrong
    ctx.lineWidth = 3
    ctx.strokeRect(x + 1.5, cy + 1.5, cw - 3, ch - 3)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `84px ${EMOJI}`
    ctx.fillStyle = C.text
    ctx.fillText(emojis[i], x + cw / 2, cy + ch / 2 - 8)
    ctx.textBaseline = 'alphabetic'
    // a faint vibe chip outline
    ctx.strokeStyle = C.lineStrong
    ctx.lineWidth = 1.5
    ctx.strokeRect(x + cw / 2 - 36, cy + ch - 34, 72, 20)
    if (i === 1) {
      brackets(ctx, x, cy, cw, ch, 22)
      // tilted sticker overlapping the top edge
      ctx.save()
      ctx.translate(x + cw / 2, cy - 2)
      ctx.rotate((-3 * Math.PI) / 180)
      ctx.font = `700 14px ${MONO}`
      const t = "I PREDICT YOU'LL PICK THIS"
      const sw = Math.ceil(ctx.measureText(t).width) + 28
      ctx.fillStyle = C.model
      ctx.fillRect(-sw / 2, -14, sw, 28)
      ctx.fillStyle = C.onModel
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(t, 0, 1)
      ctx.restore()
    }
  }
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  return c
}
