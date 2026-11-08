# DEFY PRD

Sundai Hack 148, Sunday 2026-11-08. Owner: Wilson. Status: shipped on build day, live at https://wilsonwu-ai.github.io/sundai-hack-148/. Sections 1 to 11 are the plan written before the build, kept as written. Section 12 records what shipped, what changed and which open questions were answered.

Sources: `SPEC.md` (the frozen build spec, cited as SPEC), `research/PICK.md`, `research/verified.json` (facts cited by id with the source link, verified entries only), the event page (`research/event.md`), the X signals table (`research/x/x_signals.md`) and `research/rubric.md`. Numbers are cited to one of these. The plan was written before anyone played DEFY, so sections 1 to 11 state no outcome numbers; measured numbers are in section 12.

## 1. Executive summary

DEFY is a 60-second phone game. A behavioral model predicts your next pick and seals the guess with a hash before you tap. In Round 2 it shows you its guess, dares you to pick something else, and seals a second guess for what you will pick instead. The result card shows how many picks it called, with the chance baseline beside each count.

The goal for Hack 148 is to win the Sundai vote and give the sponsor guest a demo that uses BehaviorGPT-v4 honestly. Hook: "Never let them predict your next move." That line mirrors an X post that reached 30,898 likes and 5,648,425 views (X signals table).

## 2. Problem statement

**Who has the problem.** People who see "AI knows what you will do" claims every day and have no way to test them. Builders at a behavioral-model hackathon have the mirror problem: the sponsor model is strong on benchmarks, but a benchmark does not feel like anything on a phone.

**What the problem is.** Existing toys predict you blind, one time, and ask for trust. Rigged Draw, an October 2026 Show HN, guesses your picks and compares you with 206 people from a psychology study; its mirror page shows 209 points and 116 comments ([R3-F15](https://zeli.app/story/50074909)). The Aaronson Oracle guesses your next key press ([R1-F17](https://people.ischool.berkeley.edu/~nick/aaronson-oracle/)). Neither shows you the prediction and then tests whether you can escape it.

**Why it is painful.** The question people argue about is whether seeing a prediction changes the choice. A 2026 study of 1,305 people found that over 40% treated AI as an authority on their own behavior and that predictions alone may narrow the options people consider ([R3-F13](https://arxiv.org/abs/2603.28944), [R3-F14](https://arxiv.org/abs/2603.28944)). Nobody lets you try it in a minute.

**Evidence.** Full evidence and prior art are in `research/REPORT.md`. Candidate scoring is in `research/PICK.md`.

## 3. Users and personas

**P1. The Sundai voter.** A hacker at the event who votes on cards from a phone before the final presentation. Needs: understand the project in a glance, see a number, feel a reason to vote. Success: votes for DEFY.

**P2. The phone scroller from X or LinkedIn.** Arrives from a post, with no context, on a phone, with one hand. Needs: a hook that makes sense without reading, a 60-second loop, a card worth posting. Success: finishes a run and shares the card.

**P3. The sponsor guest and judges.** The guest is Rickard Brüel-Gabrielsson, MIT PhD and Unbox AI co-founder (event page). Judges are the Sundai audience at the final presentation. Needs: see BehaviorGPT-v4 used on sequences of actions plus context, in a way that does not overclaim and respects the service terms. Success: the guest can point to DEFY as a clear use of the model.

## 4. Why now (strategic context)

- **The sponsor is in the room.** The event is built around BehaviorGPT-v4, trained on 150 billion actions across retail, engagement and payments (event page; [S-1](https://research.unboxai.com/behaviorgpt-v4-one-large-behavioral-model.pdf)). A game is a faster way to show what it does than another storefront. Unbox's own three demos are a store, an art wall and an anomaly detector ([S-7](https://research.unboxai.com/behaviorgpt-v4-one-large-behavioral-model.pdf), [R2-F15](https://github.com/Unbox-AI/aic-artworks), [R2-F14](https://github.com/Unbox-AI/behaviorgpt-anomaly)).
- **The hook is proven on X.** The same line as our hook drew 5,648,425 views from an account with 8,031 followers, while a post from an account with 2,172,233 followers drew 179,749 (X signals table).
- **A recent, citable question.** The 2026 study above gives the claim a source ([R3-F13](https://arxiv.org/abs/2603.28944)).
- **A crowded blind-prediction lane.** Rigged Draw is dated 2026-10-13 ([R3-F15](https://zeli.app/story/50074909)), so a plain blind game would look like a copy. The open round is the difference.
- **Sundai principles.** Ship a simple web demo that works on the internet, and use shortcuts (event page). DEFY is a static site with an optional backend.

## 5. Solution overview

Described by behavior. Full contracts are in SPEC sections 1 to 5.

1. **Intro.** Hook, one-line rules, Play. A live counter appears only if the backend answers. The engine is BehaviorGPT if the ranking call answers within 800 ms, else a local habit model (SPEC section 1).
2. **Round 1, Blind, 6 turns.** Four item cards plus a face-down sealed card showing only the first 8 hex characters of the commitment. After each tap the card flips to "Called it" or "Missed" and reveals the guess and the salt.
3. **Round 2, Defy, 6 turns.** One card carries the badge "I predict you'll pick this". A second sealed card holds the guess for what you pick instead. Outcomes: "You obeyed.", "Called your defiance", or "Escaped".
4. **Result.** A headline with counts and chance baselines (chance is 1.5 of 6 in Round 1, and defied divided by 3 for the defiance call), a short behavioral fingerprint, a share card, a verify-seals panel, a why-it-matters panel, Play again and Challenge a friend. A percentile appears only when the backend reports at least 20 players; otherwise the card compares with chance (SPEC section 1).
5. **Honest by design.** A frozen simulation test checks that a random player lands at chance (SPEC A2). The footer says the game is a toy and twelve taps cannot measure free will (SPEC section 5).

Architecture in one line: a static Vite and TypeScript site on GitHub Pages, plus an optional Cloudflare Worker that proxies BehaviorGPT so the API key never reaches the browser and keeps an anonymous score histogram (SPEC section 2).

## 6. Success metrics

**Leading (measured during the event)**

| Metric | How measured | Target |
|---|---|---|
| Sundai card likes by 20:30 on 2026-11-08 | Likes on the DEFY card in the Sundai vote | Open question Q1. Sundai's real anchor window is 19:45 to 20:30 (SPEC A7) |
| Replays per player | Share of runs that start a second game, from anonymous run ids | Open question Q1 |
| Share-card rate | Share-card taps or downloads divided by completed runs | Open question Q1 |
| BehaviorGPT calls | Count of rank calls that return scores, and the fallback share (turns on `habit-local`) | Report both counts; no pass mark |

**Lagging (after the event)**

| Metric | How measured |
|---|---|
| Post views | Views on the launch posts, compared with the reference posts in the X signals table |
| Saves | Bookmarks on the same posts (the reference meme had 6,886 bookmarks, X signals table) |

**Guardrails.** No console errors in the e2e flow (SPEC A4). No sealed item name in the DOM before a tap (SPEC A3). No raw IPs stored (SPEC section 4).

## 7. User stories and acceptance criteria

Each story maps to SPEC section 7. Thresholds are targets, not results.

**US1. As a voter, I want to understand DEFY in ten seconds, so I vote for it.** (A7)
- The intro, a Round 2 turn and the share card each score at least 4 on every viral criterion V1 to V5 in `research/rubric.md` from a blind judge, or the gap is reported (A7).

**US2. As a player, I want the model's guess locked before I tap, so I can trust it.** (A3)
- `verify` is true for the sealed id and false for every other id.
- The end-to-end test finds no sealed item name in the page before a tap.
- The verify-seals panel lets me check each turn after the run.

**US3. As a player, I want a fair test, so I know it is not rigged.** (A2)
- Over 200 seeds: a player who always picks one vibe is called at least 75% of the time in turns 3 to 6 of Round 1.
- A uniformly random player is called within 8 points of chance across all turns.
- A defier who avoids the shown card and takes their favourite remaining vibe has their defiance called at least 60% of the time.

**US4. As a phone player, I want a full run in about a minute with no friction.** (A4)
- 12 taps reach the result screen on a Pixel 7 profile and on desktop.
- Counts and chance baselines render.
- The share card PNG data URL is larger than 10 kB.
- The run works with the backend unreachable and shows the habit-model label.

**US5. As a player, I want my result as a card I can post.** (A4, A7)
- A story-size image and a link-size image are made in the browser and shared with the Web Share API, or downloaded as a fallback.
- The card line "It told me what I'd pick. I picked something else. It saw that coming too." appears only when at least one defiance was called (SPEC section 1).

**US6. As the sponsor guest, I want to see BehaviorGPT used correctly and safely.** (A5)
- The Worker maps upstream scores to the four cards and returns null for a missing item.
- An unknown id returns 400; an upstream error or timeout returns 502 with `fallback: true`; a missing key returns 503.
- The result route validates bounds and ignores a repeated run id.
- Stats return 11 bins. Requests from other origins are refused.

**US7. As a maintainer, I want the build to pass and the copy to be clean.** (A1, A6)
- Typecheck, unit tests and the build all pass (A1).
- No em dash in `src` or `index.html`, no talking-down labels in copy, and every number on the science panel maps to a verified fact id with its link (A6).

## 8. Out of scope

- Accounts, logins and any stored personal data (SPEC section 4: no IPs, only a histogram and run ids).
- Inference about health, money trouble, relationships or identity; the fingerprint stays on taste, position habit and defiance style (SPEC section 3).
- Claims that DEFY measures free will or "how predictable you are" as a scientific result.
- Real-time multi-player rooms.
- Outside item images; art is emoji only (SPEC section 3).
- A native app.
- Using the sponsor model for anything beyond ranking our own 96 catalog items.

## 9. Dependencies and risks

**Dependencies.** The BehaviorGPT API key and a catalog id, entered by Wilson (SPEC section 2). GitHub Pages for hosting. A Cloudflare Worker and KV for the optional backend. The Sundai card submission.

| Risk | Why it matters | Mitigation |
|---|---|---|
| **Prediction hit rate** | Even the sponsor reports 13% to 25% next-purchase accuracy after a viewing session ([S-9](https://research.unboxai.com/behaviorgpt-v4-one-large-behavioral-model.pdf), vendor number). A weak result card does not spread. | Four cards per turn so chance is 1 in 4 and 1 in 3 once you defy; chance printed next to every count; the A2 test as a gate; the local habit model learns taste and position within a run. Report the gap if A2 fails (A7 rule). |
| **API key timing** | Keys are issued at the event workshop, and the Worker needs one to answer. | Event page lists API keys among the tools given at the event. Worker returns 503 with `fallback: true` when no key is set, so the site works on the habit model. Key entry and deploys are held for Wilson. Each key holds two catalogs ([R2-F7](https://raw.githubusercontent.com/Unbox-AI/behaviorgpt/main/docs/catalogs.md)); upload only one. |
| **Catalog upload without images** | A related limit says an upload fails when no images can be used ([R2-F6](https://raw.githubusercontent.com/Unbox-AI/behaviorgpt/main/docs/catalog-format.md)). Our items are emoji only. | Test the upload first thing at the workshop; if refused, run on the habit model and say so on the card. |
| **Venue wifi** | A slow network breaks live ranking and the share flow. | Any error, null score or reply slower than 800 ms falls back to the habit model for that turn and flips the engine label (SPEC section 3). The site works fully offline from the backend. |
| **Sponsor terms** | The terms bar harm, deception, tracking or discrimination ([R2-F13](https://portal.unboxai.com/terms/)), require server-side keys ([R2-F12](https://portal.unboxai.com/terms/)) and allow rate limits and revocation ([R2-F11](https://portal.unboxai.com/terms/)). A game about being predicted can read as manipulation. | Sealed commitments show there is no deception. The key stays in the Worker. No tracking, no IPs, a best-effort limit of 60 rank calls per minute per IP (SPEC section 4). The fingerprint avoids sensitive traits. The footer says the game is a toy. The sponsor paper itself names privacy, consent and power asymmetries ([S-10](https://research.unboxai.com/behaviorgpt-v4-one-large-behavioral-model.pdf)); the why-it-matters panel can say so. |
| **Seven modules in one day** | The skeptic flagged scope (PICK.md). | Frozen contracts and file ownership by builder (SPEC section 6); the static core works alone. |
| **Overclaiming** | A "93%" style figure would mislead. | Potential predictability (an upper bound, [R1-F13](https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=20167789&retmode=text&rettype=abstract)) is never presented as achieved accuracy. Only observed counts from the run appear on the card. |

## 10. Hack-day launch plan

Event schedule (event page, MIT IHQ, 292 Main St, Cambridge): 10:00 Sundai intro, 10:10 AI news, 10:30 Large Behavioral Models topic intro, 10:50 idea pitching and team formation, 12:00 Unbox AI workshop, 14:00 lunch, 20:00 final presentation.

| Window | Action |
|---|---|
| 10:50 pitching | Pitch DEFY with the hook and the two-round idea. Form the team; the contracts and builder ownership are already frozen. |
| 12:00 workshop | Get the API key and catalog access. Upload the 96-item catalog and test an empty-history and a three-pick ranking call. Check the image question. |
| After the workshop | Deploy the Worker (held for Wilson), then the Pages build. Run the A4 flow on a phone on venue wifi. |
| 14:00 lunch block | Run the blind viral check on the intro, a Round 2 turn and the share card (A7). Fix the weakest. |
| Before 19:45 | Post the card to the Sundai vote with a thumbnail of the share card and the hook. Post the hook on X and LinkedIn with a link and a one-line explanation. The vote window that matters runs 19:45 to 20:30 (SPEC A7). |
| 20:00 final presentation | Demo on a real phone: Round 1, then Round 2 with a defiance. Show the verify-seals panel. Say plainly that it is a toy. Credit the sponsor model and say which engine answered. |
| After 20:30 | Read card likes, replays, share-card rate and BehaviorGPT calls. Record them against the metrics in section 6. |

## 11. Open questions

- **Q1.** What target numbers do we set for card likes by 20:30, replays per player and share-card rate? No verified baseline exists for a Sundai card, and the only reference points are external posts (X signals table).
- **Q2.** Does the catalog upload accept items with no images (see R2-F6 above)?
- **Q3.** Is there a published rate limit on the API beyond the right to limit? The terms give none ([R2-F11](https://portal.unboxai.com/terms/)).
- **Q4.** Does the guest or Unbox want a specific credit line or badge on the card?
- **Q5.** Do we turn on the engine-duel Lab view (`?lab`) for the final presentation, or keep it hidden?
- **Q6.** Where do launch posts go, and who approves them before they go out?

## 12. What shipped (8 November)

**Live.** The static site runs on GitHub Pages, and the Cloudflare Worker answers on BehaviorGPT-v4 with the key held as a server secret. In one live game on the public site, all 12 turns were ranked by BehaviorGPT-v4 (12 of 12 rank calls returned 200). The first three calls took 341 to 432 ms upstream and the other nine 141 to 150 ms, all inside the 800 ms fallback window. That test game's result was blocked from the histogram.

**Open questions answered.**
- **Q2, yes.** The emoji-only 96-item catalog uploaded through the SDK with no images.
- **Q3, still no published limit.** The Worker keeps its own best-effort limit of 60 rank calls per minute per IP.

**Two integration bugs only a real key showed.** The live API nests the ranked page under `products` (`{products: {items}}`), while the SDK's types read a top-level `items`. The SDK also names the catalog in an `x-catalog-id` header. Both are fixed in `worker/src/index.ts`, and every failure path now logs its reason, never the key.

**Added after reading the sponsor's material and the Sundai guide.**

| Addition | Why | Where |
|---|---|---|
| Boldest pick on the result | Unbox's anomaly demo flags fraud from how unlikely each step of a session is ([R2-F14](https://github.com/Unbox-AI/behaviorgpt-anomaly)); DEFY names the pick the model least expected, using the odds recorded when it sealed its guess | `src/engine/boldest.ts`, result screen |
| Play-along QR on wide screens | Sundai's top five demo live over a shared screen and slides are not allowed (sundai.club/guide), so the room scans and plays | `public/qr.svg`, intro screen |
| Zero-shot copy | The paper's title promises zero-shot transfer ([S-1](https://research.unboxai.com/behaviorgpt-v4-one-large-behavioral-model.pdf)); BehaviorGPT ranks our 96 items without ever training on them | How it works, README |
| Live percentile | The result screen reloads the stats after posting, so the percentile appears once 20 players have finished | `src/ui/app.ts` |

**Build checks.** Typecheck clean. 60 unit and simulation cases pass, and the frozen A2 simulation still holds. 11 browser checks pass on a Pixel 7 profile and on desktop, with the phone-only tap-size check skipped on desktop. The production build ships 18 kB of gzipped JavaScript (`research/qa/test-output.txt`).

**Event outcomes.** Card likes, replays per player, share-card rate and BehaviorGPT call counts (section 6) are recorded here after 20:30.
