# Sundai card draft (Hack 148)

Draft for Wilson to paste into sundai.club and set live by 19:45 (likes land 19:45 to 20:30). Not submitted.

**Title:** DEFY

**Preview (the one line voters see in the list):**
An AI seals its guess before each of your 12 taps, then shows you its guess and dares you to pick anything else.

**Thumbnail:** `public/og.png` (1200 x 630: the DEFY wordmark, "It already guessed your next tap." and the sealed 2x2 with the "I predict you'll pick this" badge). A real figure from the work, not AI art.

**Video for posts:** `docs/motion/defy-turn.mp4` (14.5 s, 1080 x 1080, one sealed turn per round, ends on the URL). `docs/motion/defy-turn.gif` is the same animation for places that only take images.

**Demo:** https://wilsonwu-ai.github.io/sundai-hack-148/

**GitHub:** https://github.com/wilsonwu-ai/sundai-hack-148

**Description:**

DEFY is a 60-second phone game about behavioral prediction. Before every tap, the model locks in its guess with a SHA-256 hash you can check afterwards, so it cannot change its answer once you have picked. In Round 2 it shows you its guess and dares you to defy it, while sealing a second guess for what you will pick instead.

It runs live on Unbox AI's BehaviorGPT-v4 through a small Cloudflare Worker that keeps the key on the server. BehaviorGPT ranks the cards zero-shot: it was never trained on these 96 items. An on-device habit model blends in and keeps the game working if the network drops.

At the end it names your boldest pick: the one the model gave the lowest odds when it sealed its guess.

It can't be rigged: in a frozen simulation of the on-device habit model (200 games per player type), a random player lands at chance (23.0% against 25%), while a player with consistent taste gets called 76.6% of the time.

Why it matters: in a 2026 study of 1,305 people, over 40% treated an AI as an authority on their own behavior (arXiv 2603.28944). Round 2 lets you test that on yourself.

A toy, not a study. Twelve taps cannot measure free will.

**Team:** Wilson Wu, plus a teammate (Sundai requires teams of at least 2).

**Tags:** behavioral models, BehaviorGPT, game

## Before posting

- The site and Worker are live: one full game on the public site on 8 November got all 12 turns from BehaviorGPT-v4 (141 to 432 ms upstream). If it stops answering before 19:45, change the second paragraph to: "It runs on an on-device habit model, with a BehaviorGPT-v4 mode through a small Cloudflare Worker that keeps the key on the server." The game itself needs no change: if the live model misses once, that game finishes on the habit model, and the result says which engine answered.
- Numbers: 23.0%, 25% and 76.6% come from `research/qa/test-output.txt`; 200 games from `SPEC.md` A2; 1,305 and 40% from `research/verified.json` (R3-F13a, R3-F13).

## Pitch (top five only: 5 minutes, no slides, shared screen)

1. Open the live site on the laptop and share the screen. On a wide screen the intro shows a QR on the right: ask the room to scan it and play along.
2. Play one game live. Move fast through Round 1, then slow down on Round 2: the card it shows you is the dare. Let the room see a sealed guess flip after the tap.
3. Finish on the result: picks called beside chance, then the boldest pick. Once 20 people have finished, the percentile appears on its own.
4. If there is time, open the verify panel and recompute one seal, then How it works for the zero-shot line.
5. Close on the room's own numbers, not a claim: "BehaviorGPT ranked 96 items it had never seen, from 12 taps. Here is how predictable this room was." Then point at the live count and the percentile.
