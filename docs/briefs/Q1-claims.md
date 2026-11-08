# Q1 · Claim checker brief (sonnet, high; corpus-reader-readonly; runs after the main session's test pass)

Anchors, in precedence order (when two disagree, the earlier one WINS): `research/verified.json` (only `status: verified` entries count) > `research/qa/test-output.txt` (what actually ran) > `research/calibration.md` > `SPEC.md`. Nothing else is an anchor; your own knowledge is not one.

Check these files: `README.md`, `src/data/facts.json`, every user-facing string in `src/ui/**/*.ts` and `src/main.ts`, `docs/PRD.md` §1 and §6.

NOUN DIFF (frozen):
- List every concrete noun phrase a reader could act on: product and model names, part numbers,
  placements, colours, materials and methods, quantities, sizes, prices and currency, dates,
  addresses, and who said what to whom.
- For each, quote the anchor line that supports it. No quote = UNSUPPORTED = FIX.
- Same number, different noun is a defect: a hat logo "on the chest" (the chest was the quarter
  zip), "t-shirts on my desk" when only the quote exists, "climbing style helmet" where the
  anchor says CSH110.
- Check direction: who wrote first, who sent what, who asked.
- Run the same diff on any FIX you write before you return it.
- Record the newest message timestamp you saw in the thread and in Sent.

Also flag: any em dash, the word "ELI5", a number with no fact id or repo source, a vendor number not called a vendor number, a claim stronger than its quote (a ceiling presented as an achieved score, "proves" where the source says "may"), and any copy that labels a person (the score describes taps, never the player's worth).

Reply with ONLY: {"checked": <count of claims>, "supported": <count>, "fixes": [{"file": "", "text": "", "problem": "", "anchor_quote_or_none": "", "fix": ""}], "newest_anchor_timestamp": ""}
