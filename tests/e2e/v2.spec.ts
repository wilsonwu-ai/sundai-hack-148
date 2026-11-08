// v2 checks (not frozen): the boldest-pick line, the presenter QR, the zero-shot copy, and no sideways scroll.
import { test, expect, type Page } from '@playwright/test'

async function noOverflow(page: Page) {
  const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth])
  expect(sw, 'the page scrolls sideways').toBeLessThanOrEqual(iw)
}

async function playThrough(page: Page) {
  await page.getByTestId('intro-play').click()
  for (let t = 0; t < 12; t++) {
    await page.getByTestId('card').nth(t % 4).click()
    await expect(page.getByTestId('reveal')).toBeVisible()
    await page.getByTestId('next').click()
    if (t === 5) await page.getByTestId('interstitial-continue').click()
  }
  await expect(page.getByTestId('result')).toBeVisible()
}

test('the result names the boldest pick with the odds the model gave it', async ({ page }) => {
  await page.goto('./')
  await playThrough(page)
  const b = page.getByTestId('boldest')
  await expect(b).toBeVisible()
  await expect(b).toContainText('Your boldest pick')
  await expect(b).toContainText(
    /on turn (1[0-2]|[1-9])\. When it sealed its guess, the model gave that pick (an? \d{1,3}% chance|less than a 1% chance)\./,
  )
  await expect(b).toContainText('Odds from the on-device habit model')
  expect(await page.locator('body').innerText()).not.toContain('—')
  await noOverflow(page)
})

test('a presenter screen shows the play-along QR and a phone does not', async ({ page, isMobile }) => {
  await page.goto('./')
  const along = page.getByTestId('play-along')
  if (isMobile) {
    await expect(along).toBeHidden()
  } else {
    await expect(along).toBeVisible()
    await expect(along).toContainText('wilsonwu-ai.github.io/sundai-hack-148')
    await expect.poll(() => page.locator('.play-along-qr').evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
    // it sits beside the 440 px column, clear of the Play button
    const qr = await along.boundingBox()
    const play = await page.getByTestId('intro-play').boundingBox()
    expect(qr?.x ?? 0).toBeGreaterThanOrEqual((play?.x ?? 0) + (play?.width ?? 0))
  }
  await noOverflow(page)
})

test('How it works credits BehaviorGPT-v4 and says it runs zero-shot', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'How it works' }).click()
  await expect(page.locator('.steps')).toContainText('BehaviorGPT-v4')
  await expect(page.locator('.steps')).toContainText('never trained on these 96 items')
  await noOverflow(page)
})
