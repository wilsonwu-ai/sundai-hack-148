# Viral + build rubric (anchored to measured precedents)

Score each criterion 1 to 5 (5 = strongest). Ground every score in the evidence named, not taste.

## Viral lens (V)
| id | criterion | evidence it rests on |
|---|---|---|
| V1 | **Ten-second phone moment**: instantly legible, surprising, works without explanation | Sundai votes are cast on cards in a ~40-min burst before demos (memory: reference-sundai-voting-mechanics); hackathon lesson "rank on the ten-second moment on a phone" |
| V2 | **Personal stake**: the result is about ME, with a number | Rigged Draw scores you vs 206 people, 209 HN points (R3-F15); Human or Not 15M conversations (R4-F1) |
| V3 | **Replay / challenge loop**: "can I beat it?", invites a second try and a friend | Aaronson Oracle live accuracy (R4-F3); Rigged Draw; X meme "NEVER LET THEM PREDICT YOUR NEXT MOVE" 30.9k likes, 5.6M views (research/x/x_signals.md) |
| V4 | **Share artifact**: one card, one number or claim, readable as a thumbnail | Sundai cards with a thumbnail reach top 3 27% of the time vs 1% without (memory) |
| V5 | **Thought-provoking claim, defensible and cited**: makes people argue about free will, control or "say vs do" without overclaiming | X: "more predictable than we want to believe" 3.4k likes (Bryan Johnson); "ChatGPT writes a psychological profile" 805k views; R3-F13/F14; S-4 |
| V6 | **Novelty vs prior art**: not a reskin of Aaronson Oracle, Rigged Draw (Oct 2026), RPS predictors, or Unbox's own three demos (storefront, art wall, anomaly) | R1-F17, R3-F15, R4-F14/F15, R2-F14/F15 |
| V7 | **Sponsor fit**: uses BehaviorGPT for what it is good at (sequences over a rich catalog, plus context), so the guest and judges care | S-1..S-8, README (events, catalogs, user context) |

## Build lens (B)
| id | criterion | evidence it rests on |
|---|---|---|
| B1 | **Buildable in hours** by 3 parallel builders against a frozen contract | Hack 143: 3 builders, 5.5 min, 29/29 tests (memory) |
| B2 | **Demo cannot break**: works with zero API (static fallback); live API optional | hackathon lesson "static site with committed data and no runtime API call is the safest demo path" |
| B3 | **Clean data, licensing and terms**: no deception, tracking or discrimination (Unbox terms R2-F13); keys server-side (R2-F12) | R2-F12, R2-F13 |
| B4 | **Privacy**: no personal data leaves the browser beyond anonymous game events | event frozen rules |

Total = sum(V) + sum(B), max 55. Print raw scores; no coarse mapping decides the pick.
