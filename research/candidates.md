# Hack 148 candidate concepts (for blind scoring)

Theme: "Behavioral Models: Predict the next action". Sponsor model: Unbox AI BehaviorGPT-v4 (12.5B LBM; SDK/REST; any catalog of items described by name/brand/category/image; events = Search, View, Order; optional user context = market, age band, gender, local time; free key by email; keys must stay server-side; terms bar deception, tracking or discrimination of people). Build window: one day, small team, deployed web demo. Fact ids refer to `research/verified.json`.

Order below is arbitrary.

---

## K1 · Ghost Shopper
- **Pitch:** tap 5 items in a store grid; a "ghost you" keeps shopping for 10 more steps by chaining the model's next-action prediction; then you take over and see how many of your real next picks the ghost already made.
- **10-second phone moment:** a translucent ghost cursor fills a cart; the overlap counter reads "Your ghost made 4 of your next 10 picks."
- **BehaviorGPT use:** `complete()` called autoregressively on View events over a store catalog.
- **Offline fallback:** in-browser co-occurrence/n-gram model over item categories.
- **Provocation:** agents will shop as you; S-6, S-7 (the model infers life context from two events).
- **Prior art overlap:** Unbox storefront demo (recommendations change with history).
- **Modules:** store grid UI, ghost animation, chaining engine, API proxy.

## K2 · Two Clicks
- **Pitch:** add 2 to 3 items to a cart; the model's next predictions reveal what it infers about your life (moving, new baby, new pet, new job), shown as a "what the store now thinks" card.
- **10-second phone moment:** you add two items and the shelf instantly fills with crib sheets or moving boxes; the card says "The store thinks you're moving."
- **BehaviorGPT use:** `complete(predict="purchase")` and next-view ranking on Order/View events; life event labelled from the categories of the top predictions.
- **Offline fallback:** hand-authored item-to-life-event map (would not be model output).
- **Provocation:** S-6 ("reads a move from two events"), S-10 (power asymmetry), R2-F13 (terms bar tracking/discrimination: must stay a sandbox).
- **Prior art overlap:** the well-known retail "pregnancy prediction" story (not verified in our research).
- **Modules:** cart UI, inference card, label mapping, API proxy.

## K3 · Called It
- **Pitch:** a 10-tap game on a product grid; before each tap the model seals its prediction (a SHA-256 commitment shown on screen); after you tap, the card flips to "Called it" or "Missed". Score = how predictable you are, vs chance and vs everyone who played.
- **10-second phone moment:** a face-down card flips to show the exact item you just tapped, with the hash that proves it was sealed before you touched it.
- **BehaviorGPT use:** `complete()` on the running View history, top-1 sealed each step.
- **Offline fallback:** in-browser pattern model (n-gram over categories plus repeat/avoid habits).
- **Provocation:** R1-F13/F14 (93% potential predictability; it barely varies between people), R4-F4 (people trying to be random are 70-80% predictable, Aaronson's claim), S-1.
- **Prior art overlap:** Aaronson Oracle (R1-F17, R4-F3), Rigged Draw Show HN Oct 2026 (R3-F15: 209 points), browser RPS predictors (R4-F14/F15).
- **Modules:** grid UI, commit-reveal, engine, score + share card, leaderboard, API proxy.

## K4 · Defy
- **Pitch:** a two-round game. Round 1 is blind: the model seals predictions before each tap. Round 2 is open: the model SHOWS its prediction and also seals a second one for "what you'll do after reading mine". Can you defy a prediction you can see? The result card has two numbers: how predictable you were, and how often it predicted your defiance.
- **10-second phone moment:** the screen says "I predict: the red sneakers." You tap the lamp to defy it. The sealed card flips: "I knew you'd defy me. Lamp."
- **BehaviorGPT use:** `complete()` top-k on the View history; shown = top-1; sealed = best-ranked item other than the shown one, given the history.
- **Offline fallback:** in-browser pattern model plus a defiance model (avoid-the-shown-item habits).
- **Provocation:** R3-F13/F14 (2026 study, 1,305 people: many treat AI as an authority on their own behavior; predictions alone can steer and narrow choices), R3-F16/F17 (prediction is control), Newcomb's paradox, S-4.
- **Prior art overlap:** Aaronson Oracle and Rigged Draw (blind round only); no prior art found for the open-prediction round.
- **Modules:** grid UI, two-round state machine, commit-reveal, engine, result + share card, live aggregate stats, API proxy.

## K5 · Words vs Actions
- **Pitch:** a duel between two models over your next click. First you SAY what you're into (one sentence). An LLM bets on your next click from your words; BehaviorGPT bets from your clicks. After 10 rounds: which model knew you better, the one that listened or the one that watched?
- **10-second phone moment:** two avatars ("Listened" vs "Watched") race on a scoreboard; "Watched" pulls ahead after your third tap.
- **BehaviorGPT use:** `complete()` on clicks; the LLM gets the same catalog plus your sentence.
- **Offline fallback:** keyword matcher for "Listened", pattern model for "Watched".
- **Provocation:** S-4 (LLM = how people describe the world; LBM = how they act), the event's own tagline ("what people do rather than what they say"), R3-F12 (say vs do), R3-F6/F7 (twins fail off the famous questions).
- **Prior art overlap:** none found as a game.
- **Modules:** intent input, duel UI, two engines, LLM proxy (extra API cost), BehaviorGPT proxy, share card.

## K6 · Human or Bot: Behavior Edition
- **Pitch:** two shopping sessions play out side by side; one is a real person's (another player's anonymized taps), one is generated by the model. Guess the human. Score vs everyone.
- **10-second phone moment:** two tap-trails animate; you pick the wrong one; "43% of players were fooled by this ghost."
- **BehaviorGPT use:** generate sessions by sampling `complete()` chains.
- **Offline fallback:** pre-generated sessions committed as data.
- **Provocation:** synthetic behavior (paper lists bots simulating real users as a security use), R4-F1/F2 (Human or Not: 15M conversations, a third fooled).
- **Prior art overlap:** AI21 Human or Not (text, 2023).
- **Modules:** session renderer, guess flow, session store (needs other players' data), generator, stats.

## K7 · Prove You're You
- **Pitch:** a two-player party game. Player A shops for 30 seconds; then Player B grabs the phone and tries to keep shopping "as A". The model's surprise score flags the impostor; how many taps until it catches them?
- **10-second phone moment:** the risk line spikes red on B's third tap: "Impostor detected in 3 taps."
- **BehaviorGPT use:** per-step likelihood of each action given history (as in Unbox's anomaly app).
- **Offline fallback:** per-step surprise from the pattern model.
- **Provocation:** S-8 (takeover caught one step after it begins), behavior as identity.
- **Prior art overlap:** Unbox's own anomaly-detection demo (R2-F14, R2-P3).
- **Modules:** two-phase flow, risk chart, scoring, API proxy.

## K8 · Predict the Room
- **Pitch:** a live multiplayer mode for a room: everyone plays a short tap round on their phone; the projector shows a live map of the room's behavior and how many of the room's picks the model called; final reveal at demo time.
- **10-second phone moment:** your dot lands on the projected map next to two strangers; "The model called 61% of this room."
- **BehaviorGPT use:** predictions per player plus item embeddings for the map.
- **Offline fallback:** pattern model plus a precomputed 2D item layout.
- **Provocation:** R1-F14 (predictability barely varies between people), crowd self-experiment.
- **Prior art overlap:** none found.
- **Modules:** player UI, realtime backend (rooms, websockets or polling), projector view, engine.

## K9 · Free Will Score
- **Pitch:** a 60-second battery of three micro-games (random keys, pick a number, shopping round); one composite "Free Will Score" card and a leaderboard.
- **10-second phone moment:** the score gauge lands on 38/100: "less free than 64% of players."
- **BehaviorGPT use:** shopping round only.
- **Offline fallback:** pattern models for all three rounds.
- **Provocation:** R1-F16 (choices decoded up to 10 s before awareness, lab task), R1-F13.
- **Prior art overlap:** Aaronson Oracle, Rigged Draw, RPS predictors (two of three rounds are existing toys).
- **Modules:** three mini-games, score model, card, leaderboard.
