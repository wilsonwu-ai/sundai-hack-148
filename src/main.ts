// DEFY entry. Fonts are self-hosted through @fontsource (no CDN); styles live in src/ui/styles.css.
import '@fontsource/big-shoulders-display/800'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/700.css'
import './ui/styles.css'
import { startApp } from './ui/app'
import { loadCardFonts, renderLinkCard } from './ui/share-card'

async function renderOgPage(root: HTMLElement): Promise<void> {
  // ?og: only the 1200x630 link card on an otherwise empty page, for screenshots into public/og.png.
  await loadCardFonts()
  document.body.classList.add('og-page')
  const canvas = renderLinkCard()
  canvas.setAttribute('role', 'img')
  canvas.setAttribute('aria-label', 'DEFY link card')
  root.replaceChildren(canvas)
}

const root = document.getElementById('app')
if (root) {
  if (new URLSearchParams(window.location.search).has('og')) void renderOgPage(root)
  else startApp(root)
}
