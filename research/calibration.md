# Habit model calibration (2026-11-08)

Why: the first SPEC draft gave every feature one learning rate (0.6). Before freezing the honesty tests, the orchestrator prototyped the model exactly as specified (`scripts/calibrate-habit.mjs`, plain Node, synthetic 96-item catalog, the frozen call order) and played 200 seeded games per simulated player.

Result: with one shared rate, a perfectly consistent player was called only 60.8% on Round 1 turns 3-6 (68.3% even when their favourite vibe was dealt). Price, tone and position moved as fast as taste and drowned it out after two or three picks. Per-group rates fix it without hurting honesty:

| simulated player (200 games each) | one rate 0.6 | frozen rates | chance |
|---|---|---|---|
| consistent taste, Round 1 turns 3-6 | 60.8% | **76.6%** | 25% |
| always taps bottom-right, Round 1 turns 3-6 | 96.3% | **92.5%** | 25% |
| 70% consistent / 30% random, Round 1 turns 3-6 | 40.1% | **50.9%** | 25% |
| uniformly random, Round 1 | 24.8% | **25.5%** | 25% |
| uniformly random, Round 2 defiances called | 31.3% | **34.9%** | 33.3% |
| defier: avoids the guess, takes next favourite | 60.3% | **74.7%** | 33.3% |
| defier: picks the opposite vibe | 43.3% | **49.1%** | 33.3% |

Frozen rates: vibe 1.0, price 0.05, tone 0.05, position 0.4, same-position 0.4, same-vibe 0.4, is-shown 0.6, vibe-distance 0.6; L2 0.01; priors top-left +0.2, is-shown -2.5.

Frozen test thresholds sit about 10 points under the prototype (the real catalog and deck differ in detail): consistent ≥ 65%, corner-tapper ≥ 75%, defier ≥ 60%, random within ± 6 points of chance. A random player lands at chance whatever the model does, which is the point: the score cannot be rigged, only earned.

Reproduce: `node scripts/calibrate-habit.mjs`.
