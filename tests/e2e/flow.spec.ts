// FROZEN (orchestrator). Acceptance A3 (no sealed item in the DOM before the tap, seals verify in the
// browser) and A4 (12 taps to the result, share card, no console errors, habit label with no backend).
import { test, expect, type Page } from '@playwright/test'

const FOOTER = 'A toy, not a study. Twelve taps cannot measure free will.'
const WORDS = ['Called it', 'Missed', 'Called your defiance', 'Escaped', 'You obeyed']
const norm = (s: string | null) => (s ?? '').replace(/\s+/g, ' ').trim()

async function sha256hex(page: Page, s: string) {
  return page.evaluate(async (x) => {
    const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(x))
    return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('')
  }, s)
}

function watchErrors(page: Page) {
  const errors: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  page.on('pageerror', (e) => errors.push(String(e)))
  return errors
}

async function nextTurn(page: Page, t: number) {
  await page.getByTestId('next').click()
  if (t === 5) await page.getByTestId('interstitial-continue').click()
}

test('twelve taps: sealed before the tap, verified after, result and share card', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('./')
  await expect(page.getByTestId('intro-play')).toBeVisible()
  await expect(page.locator('body')).toContainText(FOOTER)
  await expect(page.locator('meta[property="og:image"]')).toHaveCount(1)
  expect(await page.locator('body').innerText()).not.toContain('—')
  await page.getByTestId('intro-play').click()

  const statuses: string[] = []
  for (let t = 0; t < 12; t++) {
    const round = t < 6 ? 1 : 2
    await expect(page.getByTestId('round-label')).toContainText(String(round))
    await expect(page.getByTestId('turn-counter')).toContainText(String((t % 6) + 1))
    const cards = page.getByTestId('card')
    await expect(cards).toHaveCount(4)

    // The seal shows only its commitment.
    const hex8 = norm(await page.getByTestId('sealed-commit').textContent())
    expect(hex8).toMatch(/^[0-9a-f]{8}$/)
    expect(norm(await page.getByTestId('sealed-card').textContent())).toBe(`sealed · ${hex8}`)

    // Nothing marks the sealed card: plain cards share one attribute signature.
    const sigs = await cards.evaluateAll((els) =>
      els.map((el) => ({
        id: el.getAttribute('data-id') ?? '',
        shown: el.querySelector('[data-testid="predict-badge"]') !== null,
        sig: [...el.attributes]
          .filter((a) => !['data-id', 'data-pos', 'aria-label'].includes(a.name))
          .map((a) => `${a.name}=${a.value}`)
          .sort()
          .join('|'),
      })),
    )
    const plain = sigs.filter((s) => !s.shown)
    expect(new Set(plain.map((s) => s.sig)).size).toBe(1)
    expect(sigs.filter((s) => s.shown)).toHaveLength(round === 1 ? 0 : 1)
    if (round === 2) await expect(page.getByTestId('predict-badge')).toContainText("I predict you'll pick this")

    // Everything outside the four cards, serialized before the tap.
    const outside = await page.evaluate(() => {
      const c = document.documentElement.cloneNode(true) as HTMLElement
      c.querySelectorAll('[data-testid="card"]').forEach((e) => e.remove())
      return c.outerHTML
    })

    // Round 1: top-left. Round 2: obey once, then defy with the first unbadged card.
    let target = cards.nth(0)
    if (round === 2) {
      target =
        t === 6
          ? page.locator('[data-testid="card"]:has([data-testid="predict-badge"])')
          : page.locator('[data-testid="card"]:not(:has([data-testid="predict-badge"]))').first()
    }
    await target.click()

    const reveal = page.getByTestId('reveal')
    await expect(reveal).toBeVisible()
    const status = norm(await reveal.textContent())
    expect(WORDS.some((w) => status.includes(w)), status).toBe(true)
    statuses.push(status)
    const id = norm(await page.getByTestId('reveal-id').textContent())
    const salt = norm(await page.getByTestId('reveal-salt').textContent())
    const name = norm(await page.getByTestId('reveal-name').textContent())
    expect(salt).toMatch(/^[0-9a-f]{32}$/)
    expect((await sha256hex(page, `${id}:${salt}`)).slice(0, 8)).toBe(hex8)
    expect(sigs.some((s) => s.id === id), 'the sealed id is one of the four cards').toBe(true)
    expect(outside.includes(id), `sealed id ${id} was in the DOM outside its card before the tap`).toBe(false)
    expect(outside.includes(name), `sealed name ${name} was in the DOM outside its card before the tap`).toBe(false)

    await nextTurn(page, t)
  }

  expect(statuses.slice(0, 6).every((s) => /Called it|Missed/.test(s))).toBe(true)
  expect(statuses[6]).toContain('You obeyed')
  expect(statuses.slice(7).every((s) => /Called your defiance|Escaped/.test(s))).toBe(true)

  await expect(page.getByTestId('result')).toBeVisible()
  await expect(page.getByTestId('result-headline')).toContainText('It called')
  await expect(page.getByTestId('chance')).toBeVisible()
  await expect(page.getByTestId('chance')).toContainText(/chance/i)
  await expect(page.getByTestId('engine')).toContainText(/habit/i)
  await expect(page.locator('body')).toContainText(FOOTER)
  expect(await page.locator('body').innerText()).not.toContain('—')

  await page.getByTestId('make-card').click()
  const img = page.getByTestId('card-preview')
  await expect(img).toHaveAttribute('src', /^data:image\/png;base64,/)
  expect(((await img.getAttribute('src')) ?? '').length).toBeGreaterThan(13700)
  await expect(page.getByTestId('share')).toBeVisible()

  await page.getByTestId('verify-open').click()
  await expect(page.getByTestId('seal-row')).toHaveCount(12)
  await expect(page.getByTestId('seal-row').filter({ hasText: /verified/i })).toHaveCount(12)

  expect(errors).toEqual([])
})

test('replay starts a fresh game', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('./')
  await page.getByTestId('intro-play').click()
  for (let t = 0; t < 12; t++) {
    await page.getByTestId('card').nth(t % 4).click()
    await expect(page.getByTestId('reveal')).toBeVisible()
    await nextTurn(page, t)
  }
  await expect(page.getByTestId('result')).toBeVisible()
  await page.getByTestId('replay').click()
  const fresh = page.getByTestId('intro-play').or(page.getByTestId('round-label'))
  await expect(fresh.first()).toBeVisible()
  expect(errors).toEqual([])
})

test('tap targets are at least 48 px on a phone', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'phone layout only')
  await page.goto('./')
  const play = await page.getByTestId('intro-play').boundingBox()
  expect(play?.height ?? 0).toBeGreaterThanOrEqual(48)
  await page.getByTestId('intro-play').click()
  for (const c of await page.getByTestId('card').all()) {
    const b = await c.boundingBox()
    expect(b?.width ?? 0).toBeGreaterThanOrEqual(48)
    expect(b?.height ?? 0).toBeGreaterThanOrEqual(48)
  }
  // the whole 2x2 grid fits the first screen
  const last = await page.getByTestId('card').nth(3).boundingBox()
  expect((last?.y ?? 9999) + (last?.height ?? 0)).toBeLessThanOrEqual(page.viewportSize()?.height ?? 0)
  await page.getByTestId('card').nth(0).click()
  const next = await page.getByTestId('next').boundingBox()
  expect(next?.height ?? 0).toBeGreaterThanOrEqual(48)
})
