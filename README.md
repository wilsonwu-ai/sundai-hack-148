# DEFY

**A 60-second phone game where an AI predicts your next pick, shows you its guess, and dares you to pick something else.**

Never let them predict your next move.

Play it: https://wilsonwu-ai.github.io/sundai-hack-148/

<p align="center">
  <img src="docs/motion/defy-turn.gif" width="420" alt="Animation of one DEFY turn. Four emoji cards deal and the AI locks a sealed guess shown as a short fingerprint. You tap a card, the seal flips to reveal the guess and salt, and the fingerprint matches. In round two a vermilion badge says I predict you'll pick this, you tap a different card, and a second seal flips open. The end card reads DEFY, Never let them predict your next move.">
</p>

*One turn of DEFY: the AI seals its guess before you tap, then the seal flips so you can check it. The fingerprints and salts shown are examples.*

## Play it in 60 seconds

<img src="docs/explainer/how-defy-works.png" width="600" alt="How DEFY works in five pictures. 1, It watches: every tap teaches a small model your taste. 2, It seals: before you tap, the AI locks its guess in a box and shows only a short fingerprint of it. 3, You tap: you pick the card you really want. 4, It reveals: the box opens and the fingerprint matches the guess, so it could not cheat. 5, It dares: in Round 2 it shows its guess with an I predict you'll pick this sticker, you pick anything else, and it has sealed a second guess for what you pick instead.">

*Five steps: it watches, seals its guess, you tap, it reveals, then it dares you to pick anything else.*

1. Tap Play. Round 1 is 6 turns: pick the card you would actually want. Before each tap, the AI locks its guess behind a hash (a short fingerprint that cannot be changed later).
2. Round 2 is 6 more turns. Now the AI shows you its guess, and you try to pick anything else. It also locks a second guess for what you will pick instead.
3. Read your result: how many picks it called, with chance beside every count, your boldest pick (the one the model least expected), a share card and a panel to check every seal yourself.
4. Presenting it? Open it on a laptop. The intro shows a QR so the room can play along on their phones.

## Situation

The theme of Sundai Club Hack 148 was behavioral models, with Unbox AI's BehaviorGPT-v4 as the sponsor model. Its paper describes a 12.5B-parameter model trained to predict the next event from 150 billion user actions ([S-1](https://research.unboxai.com/behaviorgpt-v4-one-large-behavioral-model.pdf), vendor numbers). It also gives the framing we build on: a language model captures how people describe the world, a behavioral model captures how they act in it ([S-4](https://research.unboxai.com/behaviorgpt-v4-one-large-behavioral-model.pdf)).

Others have built prediction toys. The Aaronson Oracle guesses which of two keys you will press next ([R1-F17](https://people.ischool.berkeley.edu/~nick/aaronson-oracle/)); Aaronson reports 70% to 80% on people trying to type randomly, his own claim, not independently tested ([R4-F4](https://github.com/elsehow/aaronson-oracle)). Rigged Draw, an October 2026 Show HN, guesses your number picks and compares your score with 206 people from a psychology study ([R3-F15](https://zeli.app/story/50074909)).

The gap: every one predicts you blind. Nobody shows you the prediction and dares you to defy it. That is our best reading of our own search, not proof that nothing exists.

## Task

Build something viral, thought-provoking and honest, in one day, phone first. Viral means the hook lands in one glance and the result is worth posting. Honest means the score cannot be rigged and the page never overclaims.

## Action

- **Research with code quote-checks.** Every fact has an id in `research/verified.json`, and `scripts/quotecheck.py` checks each quote against its saved source. Only verified facts reach the product.
- **A PRD before the build.** [`docs/PRD.md`](docs/PRD.md) set the users, success measures, risks and hack-day plan before any code, and its section 12 records what shipped and which open questions the build answered.
- **Nine concepts, scored blind.** A skeptic who saw only concept cards scored all nine. DEFY won with 44 of 55 (`research/PICK.md`).
- **A frozen spec.** `SPEC.md` fixes the rules, types, scoring formulas and file ownership.
- **A calibration that caught a weak model.** Our first habit model used one learning rate for every feature. In simulation, a player with perfectly consistent taste was called only 60.8% of the time on Round 1 turns 3 to 6. Separate rates per feature group raised that to 76.6%, while a random player stayed at chance (25.5% in Round 1 and 34.9% of Round 2 defiances, against 25% and 33.3%). Numbers: `research/calibration.md`.
- **A three-lens design council,** merged into `docs/design-spec.md`. Contrast was measured: body text on the dark background is 17.11 to 1, and every text pair is at least 4.5 (`research/design/contrast.md`). A colour-blind check made "you" ice blue, because the model's vermilion turns mustard under deuteranopia (a red-green colour vision type) and the other candidates turned yellow too.
- **Three parallel builders against frozen tests:** engine, screens and backend.
- **Live BehaviorGPT, wired and debugged.** The Worker sends your taps to BehaviorGPT-v4 as a sequence of item views, ranked against our own 96-item catalog uploaded through the SDK. BehaviorGPT was never trained on that catalog, so every ranking is zero-shot, the property the sponsor paper's title promises. Two bugs only appeared with a real key: the live API nests its ranking under `products` while the SDK's types read a top-level `items`, and the SDK also names the catalog in an `x-catalog-id` header. Both are fixed, and every failure path in the Worker now logs its reason, never the key.
- **The boldest pick.** Unbox's own [anomaly demo](https://github.com/Unbox-AI/behaviorgpt-anomaly) flags fraud from how unlikely each step of a session is. DEFY does the same for your run: each turn keeps the odds the model gave the card you picked, recorded after the tap, and the result names the pick it least expected.
- **Built for a no-slides pitch.** Sundai's top five demo live over a shared screen, and slides are not allowed. On a wide screen the intro shows a QR so the room can play along, and the result screen refreshes the stats after posting, so the percentile appears as soon as 20 people have finished.

## Result

Tests: all 60 unit and simulation cases pass (the 54 frozen-spec cases plus 6 for the boldest pick), the TypeScript strict typecheck is clean, and every browser check passes on a Pixel 7 phone profile and on desktop Chrome: the full 12-tap flow with seals checked in the browser, no guessed item in the page before the tap, no console errors, the boldest-pick line, the presenter QR and no sideways scrolling (11 passed; the phone-only tap-size check is skipped on desktop). The production build ships 18 kB of gzipped JavaScript. Full record: `research/qa/test-output.txt`.

Live model: in one game on the public site (8 November 2026), BehaviorGPT-v4 ranked all 12 turns. The first three calls took 341 to 432 ms upstream and the other nine 141 to 150 ms, all well inside the 800 ms fallback window.

Honesty simulation:

| Simulated player (200 games each) | What is counted | Called | Chance | Bar the test sets |
|---|---|---|---|---|
| Consistent taste | Round 1, turns 3 to 6 | 76.6% | 25% | at least 65% |
| Always taps the same corner | Round 1, turns 3 to 6 | 92.3% | 25% | at least 75% |
| Taps at random | Round 1, all turns | 23.0% | 25% | within 6 points |
| Taps at random | Round 2 defiances (900) | 33.0% | 33.3% | within 6 points |
| Defies with their next favourite | Round 2 defiances | 73.5% | 33.3% | at least 60% |

Measured by `tests/unit/frozen/simulation.test.ts` against the shipped catalog and model.

Screenshots:

<p>
<img src="docs/screens/intro.png" width="190" alt="Intro: the dare before you read anything">
<img src="docs/screens/round2.png" width="190" alt="Round 2: the AI shows its guess and seals a second one">
<img src="docs/screens/reveal.png" width="190" alt="Reveal: the sealed guess flips after the tap">
<img src="docs/screens/result.png" width="190" alt="Result: counts beside chance">
</p>

<img src="docs/screens/share-card.png" width="300" alt="The share card">

<img src="docs/screens/boldest.png" width="420" alt="The boldest pick: the card the model gave the lowest odds when it sealed its guess">

<img src="docs/screens/desktop.png" width="640" alt="On a laptop, the intro shows a QR so the room can play along">

## Why it can't be rigged

Before any card is tappable, the game picks the AI's guess, then computes a SHA-256 hash (a standard one-way fingerprint function) of the guess plus a random 32-character salt. Only the first 8 characters show, on a face-down card. After your tap, the card flips and reveals the guess and the salt. You can recompute the hash in the verify panel, and the guessed item is never in the page before your tap.

<img src="docs/diagrams/seal.png" width="640" alt="One sealed turn, left to right. Before your tap: the model picks a guess, hashes the item id with a random 16-byte salt using SHA-256, and shows a face-down card with only the first 8 hex characters. After your tap: the card flips to reveal the guess and salt, and the verify panel recomputes the hash and finds it matches. In Round 2 the model also shows one guess openly and seals a second guess among the other three cards.">

*The guess is sealed before any card is tappable. The example is real: hash vanilla-candle with that salt and you get 027d8ca3.*

The second check is a test. In a frozen simulation of 200 games per simulated player (`SPEC.md` A2, `tests/unit/frozen/simulation.test.ts`), a player who taps at random must land within 6 points of chance: 25% in Round 1 and 33.3% of defiances in Round 2. A player with a real pattern gets called more. The score is earned, not handed out.

## Why this matters

- A 2026 study of 1,305 people ([R3-F13a](https://arxiv.org/abs/2603.28944)) found that over 40% treated an AI as an authority on their own behavior ([R3-F13](https://arxiv.org/abs/2603.28944)). Round 2 lets you test that on yourself.
- The same paper suggests that seeing a prediction may narrow the futures people consider ([R3-F14](https://arxiv.org/abs/2603.28944)).
- A well-known 93% figure for how predictable human movement is ([R1-F13](https://pubmed.ncbi.nlm.nih.gov/20167789/)) is an upper bound from information theory, not what any model achieved. DEFY shows only counts from your own run, beside chance.
- The sponsor paper notes that predicting human actions touches privacy, consent and power gaps between organizations and individuals ([S-10](https://research.unboxai.com/behaviorgpt-v4-one-large-behavioral-model.pdf)). A game where you can see and test the prediction is one small answer.

## How it works

The habit model runs in your browser. It scores each of the four cards from its vibe, price, tone and screen position, whether it repeats the spot or vibe of your last pick, and, in Round 2, how far its vibe sits from the card it showed you. It starts with a slight pull to the top-left card and a strong push away from the card it showed. After every tap it nudges its weights toward what you picked, with taste learning fastest. In Round 2 its sealed defiance guess is its favourite among the three cards it did not show.

When the backend is on, a small Cloudflare Worker (a tiny server at the network edge) sends your picks so far to BehaviorGPT-v4 and gets scores for the four cards. BehaviorGPT ranks them zero-shot: it was never trained on these 96 items. The API key stays on that server, as the terms require ([R2-F12](https://portal.unboxai.com/terms/)). Those scores are blended with the habit model's. If the live model is slow (over 800 ms) or fails, the game switches to the habit model for the rest of that run, and the result screen says which engine answered.

Your boldest pick comes from the same numbers. Before each tap, the model's prediction gives every card odds. After the tap, the game keeps the odds of the card you picked, and the result names the turn where they were lowest, along with which engine set them.

Without the backend, the game still works on the habit model alone. You lose the live counter and the percentile, and the card compares you with chance. A percentile appears only once at least 20 players have finished.

<img src="docs/diagrams/system.png" width="640" alt="DEFY architecture. The phone browser runs a static GitHub Pages site with the game engine, the on-device habit model and the Web Crypto seal. It blends habit logits with z-scored BehaviorGPT scores, then softmax, to get odds for each card. An optional Cloudflare Worker holds the API key and rate-limits calls: POST /api/rank goes to the BehaviorGPT-v4 API, which ranks the four cards zero-shot on our 96-item catalog. If the live model is slow or fails, the habit model alone is used. POST /api/result and GET /api/stats go to Workers KV, an anonymous result histogram with no IP address stored.">

*The game runs in your browser. The optional Worker adds live BehaviorGPT scores and an anonymous histogram, and the API key never reaches the page.*

## Privacy

Your taps stay in your browser. When the live model is on, each turn sends only item ids, your timezone and a random session id to our server, and your final counts are saved anonymously for the histogram. No IP address is ever written to storage.

## Run locally

```
npm install
npm run dev
npm test
npm run test:e2e
```

## Deploy

The static site goes to GitHub Pages. The optional backend lives in `worker/`; setup steps are in [worker/README.md](worker/README.md).

## Credits

Unbox AI's BehaviorGPT, and Sundai Club Hack 148.

## License

MIT. See [LICENSE](LICENSE).

A toy, not a study. Twelve taps cannot measure free will. · Built at Sundai Hack 148 with Unbox AI's BehaviorGPT.
