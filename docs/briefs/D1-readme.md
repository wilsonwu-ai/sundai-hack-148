# D1 · README drafter brief (sonnet, high, runs alongside the builders)

Read: `SPEC.md`, `docs/PRD.md`, `research/REPORT.md`, `research/PICK.md`, `research/calibration.md`, `research/design/contrast.md`, `docs/design-spec.md` §1, `research/x/x_signals.md`, and `research/verified.json` (cite facts by id, `status: verified` only). Skills to apply: `~/.claude/skills/management-consulting/SKILL.md` and `~/.claude/skills/pyramid-principle/SKILL.md` (answer first, MECE groups, STAR).

Write exactly one file: `README.md` at the project root. 900 to 1,300 words.

Shape (pyramid, answer first):
1. `# DEFY` + the one-line pitch + the hook + `{{LIVE_URL}}` + the thumbnail `![DEFY](docs/og.png)`.
2. "Play it in 60 seconds": three lines.
3. STAR, one section each. **Situation**: the theme and the sponsor model (S-1, S-4), what people already built (Aaronson Oracle R1-F17/R4-F4, Rigged Draw R3-F15) and the gap (nobody shows you the prediction and dares you to defy it). **Task**: viral, thought-provoking and honest, in one day, phone first. **Action**: research with code quote-checks, nine concepts scored blind, the pick (PICK.md), a frozen spec, the calibration that caught a weak model (calibration.md, with its numbers), a three-lens design council merged with measured contrast and a colour-blind check, three parallel builders against frozen tests. **Result**: placeholders the main session fills: `{{TESTS}}`, `{{A2_TABLE}}`, `{{SCREENSHOTS}}`.
4. "Why it can't be rigged": SHA-256 commit-reveal before every tap, and the random-player test that lands at chance.
5. "Why this matters": R3-F13 + R3-F13a, R3-F14, R1-F13, S-10, each with its link.
6. "How it works": the habit model in four plain sentences, BehaviorGPT through a small Worker that keeps the key server-side (R2-F12), what happens offline.
7. Privacy (copy deck §8 privacy line), Run locally (`npm install`, `npm run dev`, `npm test`, `npm run test:e2e`), Deploy (link `worker/README.md`), Credits (Unbox AI's BehaviorGPT, Sundai Club Hack 148), MIT license, and the footer line.

Rules: every number names a verified fact id or a repo file; no number that is not in those files; plain words, gloss technical terms once; no em dashes; never "ELI5"; leave the `{{...}}` placeholders exactly as written. Reply with ONLY: {"files_written": ["README.md"], "fact_ids_cited": [...], "placeholders": [...], "words": 0, "incomplete": false, "notes": ""}
