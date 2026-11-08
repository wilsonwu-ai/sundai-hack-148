# Sundai card draft (Hack 148)

Draft for Wilson to paste into sundai.club and set live by 19:45 (likes land 19:45 to 20:30). Not submitted.

**Title:** DEFY

**Preview (the one line voters see in the list):**
An AI seals its guess before each of your 12 taps, then shows you its guess and dares you to pick anything else.

**Thumbnail:** `public/og.png` (1200 x 630: the DEFY wordmark, "It already guessed your next tap." and the sealed 2x2 with the "I predict you'll pick this" badge). A real figure from the work, not AI art.

**Demo:** https://wilsonwu-ai.github.io/sundai-hack-148/

**GitHub:** https://github.com/wilsonwu-ai/sundai-hack-148

**Description:**

DEFY is a 60-second phone game about behavioral prediction. Before every tap, the model locks in its guess with a SHA-256 hash you can check afterwards, so it cannot change its answer once you have picked. In Round 2 it shows you its guess and dares you to defy it, while sealing a second guess for what you will pick instead.

It runs on Unbox AI's BehaviorGPT through a small Cloudflare Worker that keeps the key on the server, blended with an on-device habit model that keeps the game working offline.

It can't be rigged: in a frozen simulation of 200 games per player type, a random player lands at chance (23.0% against 25%), while a player with consistent taste gets called 76.6% of the time.

Why it matters: in a 2026 study of 1,305 people, over 40% treated an AI as an authority on their own behavior (arXiv 2603.28944). Round 2 lets you test that on yourself.

A toy, not a study. Twelve taps cannot measure free will.

**Team:** Wilson Wu, plus a teammate (Sundai requires teams of at least 2).

**Tags:** behavioral models, BehaviorGPT, game

## Before posting

- If the Worker is not live by 19:45, change the second paragraph to: "It runs on an on-device habit model, with a BehaviorGPT mode through a small Cloudflare Worker that keeps the key on the server."
- Numbers: 23.0%, 25% and 76.6% come from `research/qa/test-output.txt`; 200 games from `SPEC.md` A2; 1,305 and 40% from `research/verified.json` (R3-F13a, R3-F13).
