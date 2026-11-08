# DEFY design spec (merged design council, 2026-11-08)

Merged by the orchestrator from three independent lenses (`research/design/L1-claude-design.json`, `L2-open-design.json`, `L3-ui-ux-pro-max.json`; each self-scored 4/4/4). They converged on the core: near-black field, one hot colour that belongs to the model, a hatched "sealed" strip with a mono hash, a badge plus a non-colour cue on the predicted card, a flip-and-stamp reveal, and a 12-pip receipt. Where they split, the decision and its reason are noted. SPEC.md wins on any conflict.

## 1. Direction: evidence locker

A forensic receipt look. Ink field, mono seals, sharp corners, no gradients, no glass, no glow. Two voices only: **the model speaks in vermilion, you speak in ice blue.** Everything else is ink, bone and grey.

Decision log:
- **"You" colour = ice blue**, not lime (L1) or mint (L3). Measured: under deuteranopia vermilion turns mustard and lime and mint turn yellow or beige, so the two voices collapse; ice blue stays blue. Shapes carry meaning too (filled = the model called it, ring = you escaped).
- **Seal strip above the grid** (L1), not below (L2, L3). Your thumb covers the lower half of the screen when you tap, so the reveal must happen above it.
- **Badge = tilted sticker + reticle brackets.** Sticker (L2) because peeling it off is the defy moment; brackets (L1) because they read without colour.
- **Corners 4 px** (L1 and L2 agree; L3 wanted 20).
- **Fonts:** Big Shoulders Display (L1) for display and numerals, system UI stack for body (fast on venue wifi), JetBrains Mono (L3) for seals. All self-hosted through `@fontsource` (installed). Never a CDN.

## 2. Tokens (CSS custom properties on `:root`)

Contrast measured with the WCAG formula (`research/design/` notes; script in the orchestrator log). All pairs pass AA.

| token | dark (default) | light | measured contrast |
|---|---|---|---|
| `--bg` | `#0D0E11` | `#F3EFE6` | |
| `--surface` | `#171920` | `#FFFDF8` | |
| `--surface-2` | `#20232C` | `#E8E3D6` | |
| `--line-subtle` | `#2A2D38` | `#D9D3C3` | decorative only |
| `--line-strong` | `#686E80` | `#7A7568` | 3.80 / 4.00 on bg (UI ≥ 3) |
| `--text` | `#F4F1EA` | `#14151A` | 17.11 / 15.89 |
| `--muted` | `#A9ACB5` | `#55575F` | 8.51 / 6.28 |
| `--model` | `#FF5A36` | `#B83310` | 6.22 / 5.20 |
| `--on-model` | `#0D0E11` | `#FFFFFF` | 6.22 / 5.97 on model |
| `--you` | `#7CC4FF` | `#0B5FA5` | 10.29 / 5.73 |
| `--on-you` | `#0D0E11` | `#FFFFFF` | 10.29 / 6.57 on you |
| `--hatch` | `#2B2F3A` | `#D9D3C3` | pattern behind the seal plate only |
| `--focus` | `#FFFFFF` | `#14151A` | 3 px focus ring |

Theme: dark by default; light via a 48 px toggle in the top bar that sets `data-theme` on `<html>`; honour `prefers-color-scheme: light` on first visit. **Share cards always render the dark set.**

Spacing: 4 px grid; side gutter 16 px; grid gap 12 px. Radius 4 px everywhere (pills 999 px).

Motion tokens: `--t-tap: 100ms`, `--t-enter: 180ms ease-out`, `--t-exit: 120ms ease-in`, `--t-flip-in: 140ms ease-in`, `--t-flip-out: 180ms cubic-bezier(.2,.8,.2,1)`, `--t-stamp: 140ms`.

## 3. Type

| role | font | size / line height |
|---|---|---|
| wordmark DEFY | Big Shoulders Display 800 | 120/104 (never below 88 at 390 wide) |
| result numeral (predictability %) | Big Shoulders Display 800 | 120/104, tabular |
| h1 / interstitial title | Big Shoulders Display 800 | 40/40 |
| result headline | system UI 700 | 28/32 |
| card name | system UI 600 | 18/22, max 2 lines |
| body | system UI 400 | 16/24 |
| small | system UI 400 | 14/20 |
| label / chip | JetBrains Mono 700 caps, +0.06em | 12/16 (13 px floor for anything read as text) |
| seal hash | JetBrains Mono 700 | 20/24 |

System UI stack: `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`. Emoji stack: `"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`. Before any canvas draw: `await document.fonts.load('800 120px "Big Shoulders Display"')` and the mono equivalent.

## 4. Screens (mobile first, 390 x 844; desktop centres a 440 px column)

### Intro
safe-top 44 · top bar 48 (small wordmark left; "How it works" link and theme toggle right, both ≥ 48 px) · wordmark DEFY ~120 · hook, 2 lines (24/28) · rules line · ghost demo ~200 (a static mini 2x2 with one badged card and a mini seal strip: shows the dare before you read anything) · **Play** button 64 tall, full width, in the thumb zone · live counter 28 (only when the backend reports n ≥ 20, space reserved either way) · footer line · safe-bottom 34.

If the URL carries `?seed=<int>&vs=<0-100>` (a challenge link), show a banner above Play: "A friend was {vs}% predictable on these exact 12 deals. Beat that." and start the game with that seed.

### Round (both rounds share one layout)
safe-top 44 · header 56: round label left ("Round 1 · Blind" / "Round 2 · Defy"), turn counter right ("3 / 6"), 12-pip receipt under it · prompt 40 · **seal strip 96** with its caption · gap 12 · **2x2 grid** (cards ~173 x 200, gap 12) · gap 12 · verdict zone 88 (reserved so nothing shifts; holds the status line and the **Next** button after the reveal) · safe-bottom 34. Total fits 844 with a little flex.

### Interstitial
Full screen, centred: title "Round 2: Defy" (Big Shoulders 40), body, and a sub-line explaining the second seal; a sample badge sticker; button "I'm ready" (`interstitial-continue`).

### Result (scrolls)
Above the fold: headline (2 lines, 28/32) · two stat rows, each with a bar and a printed **chance tick** labelled "chance" (never read as a target) · predictability numeral with "chance: {c}%" beside it · trait chips (up to 3) · sticky action bar 72: **Share my card** (primary, `--model` fill), **Play again**, **Challenge a friend**. Below the fold: card preview, "Check every seal" row, why-this-matters panel (facts), footer with engine line.

### How it works (science screen)
Three numbered steps, the privacy note, and the facts from `src/data/facts.json` grouped you / science / machine / stakes. Each fact shows the big stat (if any), the line, and the source as a link. Never type a number that is not in `facts.json`.

### Verify-seals sheet
Bottom sheet, 12 rows (`seal-row`), each: turn, `sealed · 3f9a01c2`, the item, the salt (mono, middle-truncated with a copy button), and a status computed live in the browser with `verify()`: "verified" or "mismatch". Header shows the formula: `sha256("<item id>:<salt>")`.

### Lab (`?lab`, stretch, not in the e2e suite)
Engine duel: the same 12 deals scored by BehaviorGPT-v4 and by the habit model, both sealed. Build only after everything else passes.

## 5. Components

**Item card** (`<button data-testid="card">`): surface fill, 2 px `--line-strong` border, 4 px radius with the top-right corner clipped 12 px (`clip-path`), emoji 64-72 px centred, name 18/22 beneath (2 lines max, never truncated mid-word), vibe chip pinned bottom (mono 12 caps, outlined). Press: scale 0.97 within 100 ms. After a tap the other cards dim to 45%. Allowed attributes: `data-testid`, `data-pos`, `data-id`, `class`, `type`, `aria-label`, `style`. The sealed card must be indistinguishable from the others: identical classes and attributes apart from id, position and label.

**Predicted card (round 2 only)**: a sticker pill `data-testid="predict-badge"` reading "I predict you'll pick this" (mono 12 bold caps, `--model` fill, `--on-model` text, small target icon), tilted -3°, overlapping the card's top edge by 14 px (reserve the headroom); the card gets a 2 px solid `--model` outline and four reticle corner brackets. On **defy**: the sticker peels (translateY -24 px, rotate 12°, fade, 250 ms) and the brackets fly outward 24 px and fade (180 ms), then the seal flips. On **obey**: the brackets lock inward and fill.

**Seal strip** (`data-testid="sealed-card"`): full width x 96, background `repeating-linear-gradient(45deg, var(--hatch) 0 8px, transparent 8px 16px)`, with a **solid plate** in the middle holding an SVG padlock and the mono text `sealed · <span data-testid="sealed-commit">3f9a01c2</span>`. Before the tap that is its entire text content. The caption lives **outside** the element: round 1 "My guess. Locked before you tap." / round 2 "My guess if you defy. Locked before you tap." After the tap the strip flips and its revealed face is created at that moment (never pre-rendered, never hidden with CSS): emoji, `reveal-name`, the status stamp (`reveal`), `reveal-id` and `reveal-salt` in small mono, and a "verify" link.

**Status stamp** (`data-testid="reveal"`): icon plus words, slammed in at scale 1.3 to 1 over 140 ms. Called it / Called your defiance: `--model`, filled target icon. Missed / Escaped: `--you`, open ring icon. You obeyed: `--muted`, slashed icon, neutral tone (no shame).

**12-pip receipt**: 6 + 6 pips with a gap between rounds. Filled `--model` = called (or called your defiance); hollow `--you` ring = missed or escaped; slashed `--muted` ring = obeyed; dim dot = still to come. The same glyph is the hero of the share card.

**Buttons**: 56 px tall (Play 64), full-width primaries, 4 px radius, mono caps labels 14 px. Focus ring 3 px `--focus` offset 2 px.

## 6. Motion

Flip reveal 320 ms: strip rotateX 0 to 90° (140 ms ease-in), swap in the revealed face, 90° to 0 (180 ms, slight overshoot), stamp lands on the swap frame. **Input unlocks on the stamp's first frame**; animations are interruptible; nothing auto-advances (the player taps Next). `navigator.vibrate(15)` on the stamp where supported. Called-your-defiance gets a 140 ms vermilion thump on the strip; Escaped gets an ice-blue ring pulse (scale 1 to 1.3, opacity .6 to 0, 300 ms).

`prefers-reduced-motion: reduce`: no transforms, rotation, peel, ring or vibration. Faces swap with a 120 ms opacity crossfade, stickers and brackets appear in their final state, and the verdict is carried by icon, words and border colour.

## 7. Share cards (canvas, client side, always dark)

**Story 1080 x 1350** (the shared PNG, also the `card-preview` image): margins 72 · brand row 88 (DEFY wordmark 64 left, `sealed · <hash of turn 1>` ribbon right) · headline block ~400 (68/76, autoshrink to a 52 px floor: "It called 4 of my 6 picks." then "When I tried to defy it, it still called 3 of 5.") · 12-pip receipt ~200 (pips 56 px) · predictability numeral 240 with "chance: 28%" · trait chips 28 px · card line (only when calledDefy ≥ 1, italic 36/44) · footer: `wilsonwu-ai.github.io/sundai-hack-148` and "A toy, not a study." The engine line goes small under the footer ("Predicted by BehaviorGPT-v4" or "Predicted by an on-device habit model").

**Link 1200 x 630** (`public/og.png` and the Sundai card thumbnail): left 640: DEFY at cap-height ~150 plus "It already guessed your next tap." at 56 px; right 480: a 2x2 motif, one card badged, the seal strip across the top. Generated by the same module so the thumbnail matches the product.

Emoji on canvas: draw with the emoji stack above, after `document.fonts.ready`; check iOS and Android.

## 8. Copy deck (use verbatim; no em dashes anywhere)

| where | text |
|---|---|
| hook | Never let them predict your next move. |
| intro rules | 12 taps. Before each one, an AI seals its guess. Then it shows you its guess and dares you to defy it. |
| play | Play |
| counter (n ≥ 20) | {n} people have tried to defy it |
| round 1 label / prompt | Round 1 · Blind / Pick the one you'd actually want. |
| round 2 label / prompt | Round 2 · Defy / Pick anything but my guess. If you can. |
| seal captions | My guess. Locked before you tap. / My guess if you defy. Locked before you tap. |
| badge | I predict you'll pick this |
| status sub-lines | Called it: Sealed before you tapped. · Missed: You surprised it. · Called your defiance: It knew you'd defy it, and how. · Escaped: It didn't see that coming. · You obeyed: You picked its guess. |
| next | Next (after turn 12: See my result) |
| interstitial | Round 2: Defy / Now I show you my guess. Pick anything else, if you can. / I'm also sealing a second guess: what you'll pick instead. / I'm ready |
| result headline | It called {called1} of my 6 picks. / When I tried to defy it, it still called {calledDefy} of {defied}. (defied = 0: I never defied it. It called {called1} of 6 anyway.) |
| stat rows | Round 1: called {called1} of 6 · chance 1.5 / Round 2: called {calledDefy} of {defied} defiances · chance {defied/3, 1 decimal} / You obeyed {obeyed} of 6 |
| predictability | {pct}% predictable · chance: {round(100*(1.5 + defied/3)/(6 + defied))}% |
| percentile (n ≥ 20) | More predictable than {p}% of players |
| traits header | Your pattern |
| buttons | Share my card · Play again · Challenge a friend |
| share text | It called {called1} of my 6 picks and {calledDefy} of my {defied} defiances. Can you defy it? {url} |
| challenge text | Same 12 deals. I was {pct}% predictable. Beat that. {url}?seed={seed}&vs={pct} |
| share card dare (added after QA) | I was {pct}% predictable. Beat that. (the challenge text; ice blue, 44 px, above a 34 px URL; "A toy, not a study." moves to the small bottom row) |
| verify | Check every seal / Each guess was locked with SHA-256 before you tapped. Recompute any of them yourself. |
| engine line (`engine`) | Predicted by BehaviorGPT-v4 (Unbox AI) plus an on-device habit model / Predicted by an on-device habit model |
| how it works | 1. It watches. Every tap teaches a small model your taste and your habits. 2. It seals. Before each tap it locks its guess with a hash you can check. 3. It dares. In round 2 it shows you its guess, then seals a second guess for what you will pick instead. |
| privacy | Your taps stay in your browser. When the live model is on, each turn sends only item ids, your timezone and a random session id to our server, and your final counts are saved anonymously for the histogram. No IP address is ever written to storage. |
| footer | A toy, not a study. Twelve taps cannot measure free will. · Built at Sundai Hack 148 with Unbox AI's BehaviorGPT. |

## 9. Accessibility

Cards are real buttons with `aria-label="{name}, {vibe}"`; keys 1 to 4 pick top-left, top-right, bottom-left, bottom-right on desktop. A polite live region announces each verdict ("Called it. It sealed Lavender candle."). Every colour cue is paired with an icon or words. Tap targets ≥ 48 px. Body text never below 14 px; nothing read as text below 13 px.

## 10. Risks carried from the council

The hash reads as theatre unless "verify" is one tap away after every flip. Canvas emoji differ by platform. Orange can read as "error", so the stamp words carry the meaning. A long name wraps inside a 173 px card (catalog names are capped at 18 characters). The flip plus stamp could make 12 taps feel slow (input unlocks on the stamp's first frame). Players may miss that round 2's seal is a second guess (the caption says so). No countdown, streaks or shame copy.
