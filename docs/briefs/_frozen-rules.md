# Frozen rules for every DEFY builder (paste-in; never relax one to make something pass)

CONTEXT GUARD (frozen):
- Never Read a file over ~400 lines whole. Grep or Glob first, then Read with offset/limit.
- Skip vendored and generated paths: node_modules, vendor, dist, build, .git, lockfiles, *.min.*, maps.
- Cap shell or grep output at ~200 lines (head/tail, -m, --max-count).
- Past ~60 tool calls, stop. Return what you have with "incomplete": true and a notes field
  a fresh agent could continue from. A clean handoff beats a bloated finish.
- Return the contract only. No narration, no transcript prose.
- Do not consult an advisor.

BUILD RULES (frozen):
- Project root: /Users/wilsonwu/sundai/hack-148. Write ONLY the paths your brief names.
- Never create, edit or delete SPEC.md, docs/**, src/contracts.ts, src/data/facts.json, tests/unit/frozen/**, tests/e2e/**, index.html, package.json, package-lock.json, tsconfig.json, vite.config.ts, playwright.config.ts or anything under research/. They are the spec. If one looks wrong, say so in your report and keep going against it as written.
- Implement the exports and signatures in SPEC.md §3/§4 and src/contracts.ts exactly. Do not widen, rename or reorder them.
- The frozen tests are the definition of done. Read the ones your brief names before writing code. Never hard-code a test's expected value; reference values come only from the spec, the contracts or src/data/.
- No new dependencies. Allowed imports: the two installed @fontsource packages (UI only), node built-ins only inside tests, nothing else. TypeScript is strict with noUnusedLocals and noUnusedParameters (prefix unused parameters with _).
- Network: remote.ts may call only `${apiBase}/api/rank`; the UI may call only `${apiBase}/api/stats` and `${apiBase}/api/result`, and only when apiBase is non-empty; the Worker may call only the Unbox upstream URL in SPEC §4. No analytics, trackers, CDNs or external fonts.
- User-facing copy comes from docs/design-spec.md §8 verbatim (it is part of your brief, so quoting it is required, not copying). No em dashes or en dashes anywhere in source. Never the word "ELI5".
- You cannot run anything. The main session runs typecheck, tests, build and Playwright, and will send you failures once. Write code you would bet passes on the first run: trace each frozen test by hand before you finish.

REPORT (frozen): reply with ONLY one JSON object:
{"files_written": [...], "exports": {"<file>": ["<name>", ...]}, "test_trace": "<one line per frozen test file: why it passes>", "assumptions": [...], "spec_doubts": [...], "incomplete": false, "notes": ""}
