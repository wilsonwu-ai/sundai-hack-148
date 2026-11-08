# B2 · UI builder brief (sonnet, high)

Read first: `docs/briefs/_frozen-rules.md` (binding), then `docs/design-spec.md` (all; it is the design and the copy deck), `SPEC.md` §1, §3 (contracts, Game, score formulas, engine exports) and §5 (UI rules and frozen test ids), `src/contracts.ts`, `src/data/facts.json`, `tests/e2e/flow.spec.ts` (the definition of done), and `tests/unit/frozen/fingerprint-copy.test.ts` (A6 copy rules). Skills to apply, read only the parts that matter for a vanilla-TS static page: `~/.claude/skills/frontend-design/SKILL.md`, `~/.claude/skills/senior-frontend/SKILL.md`.

Write exactly: `src/main.ts`, everything under `src/ui/` (screens, `styles.css`, the share-card canvas module, the verify sheet, the science screen), and `public/favicon.svg` (the reticle mark in vermilion on ink). Nothing else.

You code against the engine API in SPEC §3 (`Game`, `HabitModel`, `RemotePredictor`, `seal`'s `verify`/`short`, `score`'s functions, `fingerprint`, `CATALOG`/`getItem`). Another builder writes those files at the same time: import them by their frozen paths and names; never create or stub them.

Wiring:
- `const API = import.meta.env.VITE_API_BASE ?? ''`. Empty: `HabitModel` only and zero network calls. Set: `RemotePredictor` with a `HabitModel`, `GET /api/stats` on the intro (counter and percentile only when n ≥ 20), `POST /api/result` once at the end; failures are swallowed quietly (never `console.error` or `console.warn`, the e2e suite fails on console errors).
- Seed: `?seed=<int>` when present (challenge link, also read `vs`), else a random 32-bit value from `crypto.getRandomValues`. `runId` and `session` from `crypto.randomUUID()`. Context: timezone from `Intl.DateTimeFormat().resolvedOptions().timeZone`, hour and weekday from the local clock.
- Fonts: import the installed `@fontsource/big-shoulders-display` (800) and `@fontsource/jetbrains-mono` (400, 700) CSS from `main.ts` (check each package's files for the exact import paths). Await `document.fonts.load(...)` before drawing a canvas.
- One screen in the DOM at a time. The intro's ghost demo uses emoji only, never item names. The seal element's text is exactly `sealed · <8 hex>` (U+00B7, the 8 hex in `sealed-commit`), with an `aria-hidden` padlock SVG that has no `<title>`; its caption sits outside it. The revealed face is created after the tap. Cards are `<button type="button">` with only the allowed attributes, identical for all plain cards.
- Share: draw the 1080x1350 story card on a canvas (always the dark tokens), set `card-preview`'s `src` to `canvas.toDataURL('image/png')`, share with `navigator.share({ files })` when `navigator.canShare` allows it, otherwise download. Also export `renderLinkCard(): HTMLCanvasElement` (the 1200x630 card) and, when the URL has `?og`, render only that canvas at 1200x630 on an otherwise empty page (the main session screenshots it into `public/og.png` and the Sundai thumbnail).
- Verify sheet: 12 `seal-row`s, each checked live with `verify()` and showing "verified".
- Reduced motion, theme toggle, keys 1 to 4, polite live region: as the design spec says.
