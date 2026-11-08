# Wave 2 · build plan (waiting for "go build")

State on 2026-11-08 ~00:45 ET: Wave 1 done (research 4 agents, skeptic 1, design council + drafter 4 = 9 agents, ~495k subagent tokens). SPEC, contracts, design spec, briefs and 8 frozen test files (57 cases: 54 unit, 3 e2e run on phone and desktop) are on disk. Nothing is built yet, nothing is pushed or deployed.

| node | agent type | tier | reads | writes | after |
|---|---|---|---|---|---|
| B1 engine | article-drafter (no shell) | sonnet / high | briefs/B1-engine.md | src/engine/**, src/data/catalog.json, scripts/catalog.csv, scripts/upload_catalog.py, tests/unit/engine/** | go |
| B2 UI | article-drafter (no shell) | sonnet / high | briefs/B2-ui.md + frontend-design, senior-frontend | src/main.ts, src/ui/**, public/favicon.svg | go |
| B3 backend | article-drafter (no shell) | sonnet / high | briefs/B3-backend.md + workers-best-practices, senior-backend | worker/** | go |
| D1 README | article-drafter (no shell) | sonnet / high | briefs/D1-readme.md + management-consulting, pyramid-principle | README.md (placeholders) | go |
| main session | opus | | | typecheck, vitest, build, Playwright (Pixel 7 + desktop), screenshots, og.png, fills README placeholders | B1-B3 |
| retry (max 1 per builder) | same as builder | sonnet / high | the failing test output | its own files only | main session |
| Q1 claims | corpus-reader-readonly | sonnet / high | briefs/Q1-claims.md | nothing (returns JSON) | tests green |
| Q2 viral judge (blind) | corpus-reader-readonly | sonnet / high | briefs/Q2-viral.md | nothing (returns JSON) | screenshots |

Write targets are disjoint (reverse fake-edge test passed). Builders code against SPEC, not against each other (fake edge removed). Budget: 6 agents planned, 9 max with retries. Estimate: ~1.0-1.4M subagent tokens, ~15 min for the parallel build, ~20-30 min for test, fix and QA.

Then a separate yes for each irreversible step: create public repo `wilsonwu-ai/sundai-hack-148` and push; GitHub Pages; Worker deploy + secret (needs Wilson's Cloudflare login and Unbox key); catalog upload (needs the key); Sundai card draft by 19:45.

## Status at 2026-11-08 09:45 ET: Wave 2 done, ship steps waiting

- Built by 4 no-shell agents in 15.4 min (490.5k subagent tokens), all reports complete, no builder retries used.
- Main-session integration fixes: font import specifier (`@fontsource/big-shoulders-display/800`), `src/ui/fonts.d.ts` for TypeScript 7 side-effect import checks, receipt row overflow on phones (container-relative pip sizes), three alcohol items swapped (Signet Ring, Gilded Mirror, Soft Pretzel; same vibe, price, tone and slot).
- QA: Q1 checked 64 claims, 4 fixes, all applied at the copy deck and downstream. Q2 blind judge V1 4, V2 4, V3 3, V4 4, V5 3; re-judge after the share-card dare unchanged. V2 and V3 depend on the live counter and percentile, which need the Worker.
- Tests on the final code: tsc clean, vitest 54/54, build OK, Playwright 5/5 (phone-only check skipped on desktop). Record: `research/qa/test-output.txt`.
- Staged, not pushed: `.github/workflows/pages.yml`, LICENSE, README filled, `docs/screens/`, `public/og.png` (also the Sundai thumbnail), `.gitignore` keeps `research/sources/` and raw X dumps local.
- Waiting for a separate yes each: create public repo + push + Pages; Worker deploy (Wilson's Cloudflare login and Unbox key); Sundai card by 19:45.
