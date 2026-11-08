# DEFY · build spec (frozen 2026-11-08, Sundai Hack 148)

> One-line: a 60-second phone game where a behavioral model predicts your next pick, then shows you its guess and dares you to defy it, and seals a second guess for what you will do instead.
> Hook: "Never let them predict your next move."

Builders implement against this file. Anything marked **FROZEN** may not change without the orchestrator. Facts cited by id live in `research/verified.json` (only `status: verified` may appear in product copy).

## 1. Game (FROZEN rules)

| step | what the player sees | what the engine does |
|---|---|---|
| Intro | hook, one-line rules, Play button, live counter if the backend answers | loads catalog, picks engine (BehaviorGPT if `/api/rank` answers within 800 ms, else local habit model) |
| Round 1 "Blind", 6 turns | 4 item cards (2x2) + one face-down **sealed card** showing `sealed · <first 8 hex of commitment>` | before cards become tappable: predict, take argmax, `seal()` it, render only the commitment |
| after each tap | sealed card flips: **Called it** (match) or **Missed**, revealing the predicted item and the salt | log the turn, update the model |
| Interstitial | "Round 2: Defy. Now I show you my guess. Pick anything else, if you can." | |
| Round 2 "Defy", 6 turns | 4 cards; one carries the badge **"I predict you'll pick this"** (= model argmax); plus a sealed card for the **defiance call** | defiance call = argmax over the 3 non-shown cards, given everything learned; sealed before the cards are tappable |
| after each tap | tapped the shown card: **"You obeyed."** Otherwise the sealed card flips: **"Called your defiance"** or **"Escaped"** | log, update (defiance weight learns too) |
| Result | headline, counts with chance baselines, fingerprint, share card, verify-seals panel, why-it-matters panel, Play again, Challenge a friend | compute scores, POST anonymous result if backend is up |

Scoring (FROZEN): `called1` of 6 (chance 1.5); `defied` = Round 2 turns not on the shown card; `calledDefy` of `defied` (chance `defied/3`); `obeyed` = 6 − defied. Predictability % = `(called1 + calledDefy) / (6 + defied)`, rounded. Percentile vs other players is shown **only** when the backend reports n ≥ 20; otherwise the card compares to chance.

Result headline templates (FROZEN wording shape, numbers filled in):
- "It called {called1} of my 6 picks."
- "When I tried to defy it, it still called {calledDefy} of {defied}."  (if defied = 0: "I never defied it. It called {called1} of 6 anyway.")
- Card line: "It told me what I'd pick. I picked something else. It saw that coming too." (only when calledDefy ≥ 1)

## 2. Architecture

- **Static site** (Vite + TypeScript, no UI framework) on GitHub Pages at base `/sundai-hack-148/`. Works fully offline from the backend: local habit model, no percentile, no live counter.
- **Optional backend**: Cloudflare Worker (`worker/`) that proxies BehaviorGPT (the API key never reaches the browser; terms R2-F12) and keeps an anonymous score histogram in KV.
- **BehaviorGPT**: our own 96-item catalog embedded with the SDK (`scripts/upload_catalog.py`); the Worker ranks it with the player's picks as `viewItem` events. Deploys and key entry are held for Wilson.

## 3. Contracts (FROZEN) — `src/contracts.ts` is written by the orchestrator

```ts
export type Vibe = 'cozy' | 'adventure' | 'tech' | 'luxe' | 'wellness' | 'indulgent'
export type Tone = 'warm' | 'cool' | 'neutral'
export interface Item { id: string; name: string; emoji: string; vibe: Vibe; category: string; price: 1 | 2 | 3 | 4; tone: Tone }
export type Position = 0 | 1 | 2 | 3            // 0 top-left, 1 top-right, 2 bottom-left, 3 bottom-right
export interface Turn { round: 1 | 2; cards: string[] /* 4 ids in position order */; shown?: string /* round 2 */; sealed: string; pick: string; position: Position }
export interface Context { round: 1 | 2; tz: string; hour: number; weekday: number }
export interface Prediction { probs: number[] /* 4, sums to 1, card order */; top: string; defiance?: string /* round 2: argmax over non-shown */; engine: 'behaviorgpt-v4' | 'habit-local' }
export interface Predictor { readonly engine: Prediction['engine']; predict(history: Turn[], cards: string[], ctx: Context, shown?: string): Promise<Prediction>; observe(turn: Turn): void }
export interface Seal { commitment: string /* hex sha-256 of `${id}:${salt}` */; salt: string /* 32 hex chars */ }
export interface RunResult { runId: string; called1: number; defied: number; calledDefy: number; obeyed: number; engine: Prediction['engine'] }
export interface Stats { n: number; histogram: number[] /* 11 bins: 0,10,...,100 */; mean: number }
export interface Trait { id: string; label: string; strength: number /* 0..1 */ }
```

### Engine modules (FROZEN exports; `src/engine/`, engine builder)

| file | exports (the frozen tests import exactly these) |
|---|---|
| `rng.ts` | `mulberry32(seed: number): () => number` |
| `catalog.ts` | `CATALOG: Item[]` (from `src/data/catalog.json`), `getItem(id: string): Item` (throws on unknown id), `validateCatalog(items: Item[]): string[]` (error list, empty = valid) |
| `deck.ts` | `dealTurn(rng: () => number, used: Set<string>): string[]`: 4 ids with 4 different vibes in random positions, none already in `used`; adds them to `used` |
| `habit.ts` | `HABIT_PARAMS`, `class HabitModel implements Predictor` (`engine = 'habit-local'`, `logits(cards, shown?): number[]`, `vibeWeights(): Record<Vibe, number>`, `predict`, `observe`) |
| `remote.ts` | `BG_WEIGHT` (= 1), `class RemotePredictor implements Predictor`, `constructor(opts: { apiBase: string; habit: HabitModel; session: string; fetchImpl?: typeof fetch; timeoutMs?: number })` (timeout default 800); `engine` reflects the last prediction |
| `seal.ts` | `seal(id: string): Promise<Seal>`, `verify(id: string, s: Seal): Promise<boolean>`, `short(commitment: string): string` (first 8 hex) |
| `score.ts` | `scoreRun(turns: Turn[], engine: Prediction['engine'], runId: string): RunResult`, `predictability(r: RunResult): number` (integer 0-100), `chance(r: RunResult): { called1: number; calledDefy: number }` (1.5 and defied/3), `percentile(pct: number, stats: Stats \| null): number \| null` |
| `fingerprint.ts` | `fingerprint(turns: Turn[], habit: HabitModel): Trait[]` (0 to 3 traits, ids from `taste`, `position`, `defiance`) |
| `game.ts` | `class Game` (contract below) |

**Habit model (FROZEN, calibrated 2026-11-08 by simulation, `research/calibration.md`).** Multinomial logit, online. Features per card: vibe one-hot (6); price `(price - 2.5) / 1.5`; tone one-hot (3); position one-hot (4); same-position-as-last-pick (1/0); same-vibe-as-last-pick (1/0); is-shown (round 2, 1/0); vibe distance from the shown card (round 2: circular distance on the ring `cozy, indulgent, luxe, tech, adventure, wellness`, divided by 3; 0 when nothing is shown). Priors: all weights 0 except position 0 (top-left) = +0.2 and is-shown = -2.5. `predict`: softmax of `logits`; `top` = argmax (ties go to the lower position); `defiance` = argmax over the non-shown cards (only when `shown` is given). `observe(turn)`: recompute the probabilities with the same features (including `turn.shown`) and the pre-turn last pick, then one step per weight `w += lr_g * (x_pick - sum_j p_j * x_j) - lr_g * l2 * w`, then record the last pick. Per-group learning rates `HABIT_PARAMS.lr`: vibe 1.0, price 0.05, tone 0.05, position 0.4, samePos 0.4, sameVibe 0.4, shown 0.6, dist 0.6; `l2` 0.01. (The first draft used one rate of 0.6: a perfectly consistent player was called only 61%, because price, tone and position drowned out taste.)

**Remote predictor.** POST `${apiBase}/api/rank` (§4) with the picks so far as `history`. Logits = `habit.logits(cards, shown) + BG_WEIGHT * z(scores)` where `z` z-scores the 4 returned scores (a null score counts as the minimum). Any network error, non-200, null-only scores or a response slower than `timeoutMs` uses the habit logits alone for that turn and reports `engine = 'habit-local'`; after the first failure it stops calling the network for the rest of the run. `observe` forwards to the habit model. With `apiBase === ''` the app never constructs it (no network calls at all).

**Score formulas (FROZEN).** `predictability = Math.round(100 * (called1 + calledDefy) / (6 + defied))`. `percentile(pct, stats)` is `null` when `stats` is null or `stats.n < 20`; otherwise, with `bin = Math.round(pct / 10)`, it is `Math.round(100 * (players in bins below + 0.5 * players in the same bin) / n)`, read as "more predictable than {percentile}% of players".

**Game (FROZEN).** The UI drives the game only through this class, and a `TurnView` never contains the sealed id, so the UI cannot leak what it never receives.
```ts
export interface TurnView { round: 1 | 2; index: number /* 0..5 within the round */; cards: Item[] /* position order */; shown?: string; commitment: string }
export type RevealStatus = 'called' | 'missed' | 'calledDefy' | 'escaped' | 'obeyed'
export interface Reveal { status: RevealStatus; turn: Turn; seal: Seal }
export interface GameOptions { seed: number; predictor: Predictor; ctx: Omit<Context, 'round'> }
// class Game { constructor(o: GameOptions); next(): Promise<TurnView | null>; pick(id: string): Promise<Reveal>; readonly turns: Turn[]; readonly seals: Seal[]; result(runId: string): RunResult }
```
`next()` and `pick()` are async: "throws" means the returned promise rejects. `next()` deals with a dedicated `mulberry32(seed)` stream used only by `dealTurn`, predicts in the frozen call order (below), seals, and only then resolves; it returns `null` after 12 turns and throws if the current turn has not been picked. `pick(id)` throws unless `id` is one of the current cards; it builds the `Turn`, calls `predictor.observe(turn)`, then returns the `Reveal`. Status: round 1 `called` if sealed = pick else `missed`; round 2 `obeyed` if pick = shown, else `calledDefy` if sealed = pick, else `escaped`. Visible words: Called it, Missed, Called your defiance, Escaped, You obeyed.

### Catalog (`src/data/catalog.json`, engine builder)
96 everyday wants, 16 per vibe, generic names (no trademarks; 4 to 18 characters of letters, digits, spaces, apostrophes and hyphens; unique, case-insensitive), kebab-case ids (`^[a-z0-9-]{1,32}$`), one emoji each, retail-style `category` path (e.g. `Home > Candles`), `price` 1-4, `tone`. Also emit `scripts/catalog.csv` in the SDK's catalog format (read `research/sources/catalog-format.md`) and `scripts/upload_catalog.py` (uses `behaviorgpt`, embeds the CSV, prints the catalog id). Item art is the emoji only: no external images.

## 4. Backend contract (FROZEN) — `worker/`, backend builder

| route | request | response |
|---|---|---|
| `POST /api/rank` | `{ history: string[] (0..24 catalog ids), cards: string[4], tz: string, session: string (uuid) }` | `200 { scores: (number|null)[4], engine: 'behaviorgpt-v4', ms: number }` · `400` unknown id or bad shape · `502 { fallback: true }` on upstream error/timeout (1500 ms) · `503 { fallback: true }` when no key configured |
| `POST /api/result` | `RunResult` (`runId` matches `^[A-Za-z0-9-]{8,64}$`; `engine` is one of the two engine names; integers bounded: called1 ≤ 6, defied ≤ 6, calledDefy ≤ defied, obeyed = 6 − defied) | `200 { ok: true }`; same `runId` twice is a no-op (KV key `run:<id>`, TTL 7 days) |
| `GET /api/stats` | | `200 Stats` (cache 30 s) |

Upstream call (from the SDK source, `research/sources/sdk/`): `POST https://behaviorgpt-northeurope.api.unboxai.com/v1/vector/recommendations`, header `x-api-key: env.UNBOXAI_API_KEY`, body:
```json
{ "history": [ { "store_id": "<env.UNBOX_CATALOG_ID>", "domains": { "market": "us", "postal_code": "unk", "gender": "unk", "age_group": "unk" },
                 "timezone": "<tz>", "timestamp": "<ISO, one second apart, oldest first>", "event": { "type": "viewItem", "product": "<id>" }, "session_id": "<session>" } ],
  "store_id": "<env.UNBOX_CATALOG_ID>", "domains": { "market": "us", "postal_code": "unk", "gender": "unk", "age_group": "unk" },
  "timezone": "<tz>", "limit": 100, "offset": 0, "filters": {}, "register_event": false }
```
Response `{ items: [{ id, score, data }], offset, limit }`; map each of the 4 cards to its `score`, `null` if absent. Empty history is allowed (the model ranks on context alone).
**Worker interface (FROZEN, the frozen tests import it).** `worker/src/index.ts` has `export default { fetch(req: Request, env: Env): Promise<Response> }` and exports `interface Env { UNBOXAI_API_KEY?: string; UNBOX_CATALOG_ID: string; ALLOWED_ORIGIN: string; DEFY_KV: KVLike; UPSTREAM_TIMEOUT_MS?: string }` with its own minimal `KVLike = { get(key: string): Promise<string | null>; put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void> }` (no `@cloudflare/workers-types` dependency). Valid ids come from `src/data/catalog.json`. KV keys: `stats` (a `Stats` JSON) and `run:<runId>` (TTL 604800 s). Upstream timeout = `Number(env.UPSTREAM_TIMEOUT_MS ?? 1500)`, via `AbortController`. CORS: no `Origin` header, serve normally without CORS headers; an allowed origin (`env.ALLOWED_ORIGIN`, or `http://localhost:<port>` / `http://127.0.0.1:<port>`) gets `Access-Control-Allow-Origin: <origin>` and `Vary: Origin`; `OPTIONS` from an allowed origin returns 204 with `Access-Control-Allow-Methods: GET, POST, OPTIONS` and `Access-Control-Allow-Headers: content-type`; any other origin gets 403 on every method. Unknown route 404. More than 60 `/api/rank` calls in a minute from one `CF-Connecting-IP` returns 429 (in memory, never written to KV). Each upstream event's `timestamp` is an ISO string, one second apart, oldest first, ending at the request time. `z`-scoring in `remote.ts` uses the population standard deviation (all zeros when it is 0); a null score is replaced by the minimum non-null score first.

Rules: CORS only for `env.ALLOWED_ORIGIN` and `http://localhost:*`; never forward client headers upstream; never store IPs; KV holds only the histogram and run ids; per-IP best-effort limit of 60 rank calls per minute in memory.

## 5. UI (`src/ui/`, `src/main.ts`, UI builder)
Screens: intro, round (shared by both rounds), interstitial, result, science ("How it works"), verify-seals sheet, lab (engine duel; hidden behind `?lab`). Share card: canvas PNG 1080x1350 (story) and 1200x630 (link), generated client-side, shared with the Web Share API (files) or downloaded. Design follows `docs/design-spec.md` (merged design council output).
FROZEN UI rules: render one screen at a time (screens not on view are removed from the DOM, and the intro's ghost demo uses emoji only, no item names), the seal text is exactly `sealed · <8 hex>` with U+00B7 and no other text inside `sealed-card` (no SVG `<title>`), `public/favicon.svg` exists (a 404 is a console error), mobile-first (390x844), tap targets ≥ 48 px, WCAG AA contrast, dark by default with a light theme, `prefers-reduced-motion` respected, the sealed item's id or name is **never in the DOM before the tap** (render the commitment only), no em dashes in any visible copy, no "ELI5", every number on the science panel comes from a verified fact id with its source link, footer says: "A toy, not a study. Twelve taps cannot measure free will."

### Round 2 call order (FROZEN)
`p0 = predict(history, cards, ctx)` → `shown = p0.top` → `p = predict(history, cards, ctx, shown)` → `sealed = p.defiance` (defined, in `cards`, never equal to `shown`). Round 1: `sealed = predict(history, cards, ctx).top`. Sealing happens before any card is tappable. After the tap: `observe(turn)`, then the reveal.

### Test ids (FROZEN, the e2e suite depends on them)
`intro-play` · `round-label` · `turn-counter` · `card` ×4 (attributes allowed: `data-testid`, `data-pos` 0-3, `data-id`, `class`; nothing marks the sealed card) · `predict-badge` (round 2, inside the shown card) · `sealed-card` (pre-tap text is only `sealed · <8 hex>`) · `sealed-commit` (the 8 hex) · `reveal` (status: Called it / Missed / Called your defiance / Escaped / You obeyed) · `reveal-name` · `reveal-id` · `reveal-salt` · `next` (manual advance, no auto-advance) · `interstitial-continue` · `result` · `result-headline` · `chance` · `engine` (text contains `BehaviorGPT` or `habit`) · `make-card` · `card-preview` (an `<img>` whose src is the PNG data URL) · `share` · `replay` · `verify-open` · `seal-row` ×12 (in the verify sheet; text includes `verified` once the in-browser check passes).
API base: `import.meta.env.VITE_API_BASE ?? ''`; with no backend the first `/api/rank` failure switches the game to the habit model for the rest of the run.

## 6. Ownership (FROZEN)
| owner | writes |
|---|---|
| orchestrator | `SPEC.md`, `index.html`, `package.json`, configs, `src/contracts.ts`, `src/data/facts.json` (science panel, generated from verified facts), `tests/unit/frozen/**`, `tests/e2e/**`, `docs/design-spec.md` |
| engine builder | `src/engine/**`, `src/data/catalog.json`, `scripts/upload_catalog.py`, `scripts/catalog.csv`, `tests/unit/engine/**` |
| UI builder | `src/ui/**`, `src/main.ts`, `public/**` |
| backend builder | `worker/**` |
| doc drafters | `docs/PRD.md`, `research/REPORT.md`, later `README.md` |

## 7. Acceptance (definition of done; QA reads these anchors)
- **A1** `npm run typecheck`, `npm test`, `npm run build` pass.
- **A2 honesty + landing (simulation through `Game` + `HabitModel`, 200 seeds, frozen test `tests/unit/frozen/simulation.test.ts`):** a consistent-taste player (fixed random vibe ranking, always picks their highest-ranked dealt vibe) is called ≥ 65% on Round 1 turns 3-6 (prototype: 76.6%); a player who always taps bottom-right is called ≥ 75% on Round 1 turns 3-6 (prototype: 92.5%); a uniformly random player is called within 25 ± 6 points in Round 1 and within 33.3 ± 6 points of their Round 2 defiances (prototype: 25.5 and 34.9; proves no rigging); a defier (same taste, never picks the shown card, takes their favourite remaining vibe) has ≥ 60% of defiances called (prototype: 74.7%).
- **A3 seals:** `verify` is true for the sealed id and false for every other id; the e2e test finds no sealed item name in the DOM before a tap.
- **A4 flow (Playwright, Pixel 7 + desktop):** 12 taps reach the result screen; counts and chance baselines render; the share card PNG data URL is > 10 kB; no console errors; works with the backend unreachable and shows the habit-model label.
- **A5 worker (vitest, mocked fetch):** rank maps upstream scores to cards and returns `null` for missing items; unknown id → 400; upstream 500/timeout → 502 `{fallback:true}`; no key → 503; result validates bounds and is idempotent per runId; stats returns 11 bins; CORS refuses other origins.
- **A6 copy:** `grep -r "—" src index.html` returns nothing; no "ELI5"; science-panel numbers map to verified fact ids.
- **A7 virality proxy:** blind viral judge scores the rendered intro, a Round 2 turn and the share card against `research/rubric.md` V1-V5 at ≥ 4 each, or the gap is reported. (Real anchor: Sundai card likes at 19:45-20:30.)
