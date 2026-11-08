#!/usr/bin/env bash
# Turn on live BehaviorGPT for the DEFY Worker with your Unbox AI key.
# Paste the key into .env (UNBOXAI_API_KEY=...) or copy it to the clipboard, then run:  bash scripts/set-key.sh
# The key goes .env or clipboard -> this shell -> the catalog upload and Cloudflare's secret store.
# This script never prints the key or copies it anywhere else. The clipboard is cleared at the end.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WRANGLER=(npx --yes wrangler@4.158.0)

# The key comes from .env (UNBOXAI_API_KEY=...) when it is there, else from the clipboard.
UNBOXAI_API_KEY=""
if [ -f "$ROOT/.env" ]; then
  UNBOXAI_API_KEY="$(sed -n 's/^[[:space:]]*UNBOXAI_API_KEY[[:space:]]*=//p' "$ROOT/.env" | head -1 | tr -d "[:space:]\"'")"
fi
if [ -z "$UNBOXAI_API_KEY" ]; then
  UNBOXAI_API_KEY="$(pbpaste | tr -d '[:space:]')"
fi
if [ "${#UNBOXAI_API_KEY}" -lt 20 ] || [[ "$UNBOXAI_API_KEY" == *"://"* ]] || [[ "$UNBOXAI_API_KEY" == *"@"* ]]; then
  echo "No key found: paste it after UNBOXAI_API_KEY= in .env and save (or copy it to the clipboard), then run this again." >&2
  exit 1
fi
echo "1/4 Uploading the 96-item catalog to BehaviorGPT (this can take a few minutes)..."
# The key goes into the upload's environment only. It is never exported, so the wrangler processes below never hold it.
# NumPy 2 is pinned because an active conda env can leak an older NumPy into uv's environment.
OUT="$(cd "$ROOT" && UNBOXAI_API_KEY="$UNBOXAI_API_KEY" uv run --no-project --with behaviorgpt --with "numpy>=2" python scripts/upload_catalog.py)"
printf '%s\n' "$OUT"
CATALOG_ID="$(printf '%s\n' "$OUT" | sed -n 's/^catalog id: //p' | head -1)"
if [ -z "$CATALOG_ID" ]; then
  echo "No catalog id came back, so nothing else was changed." >&2
  exit 1
fi

echo "2/4 Writing the catalog id into worker/wrangler.toml..."
sed -i '' "s/^UNBOX_CATALOG_ID = .*/UNBOX_CATALOG_ID = \"$CATALOG_ID\"/" "$ROOT/worker/wrangler.toml"

echo "3/4 Storing the key as a Cloudflare secret..."
(cd "$ROOT/worker" && printf %s "$UNBOXAI_API_KEY" | "${WRANGLER[@]}" secret put UNBOXAI_API_KEY)

echo "4/4 Redeploying the Worker with the catalog id..."
(cd "$ROOT/worker" && "${WRANGLER[@]}" deploy)

unset UNBOXAI_API_KEY
pbcopy < /dev/null
echo "Done. BehaviorGPT is wired in and your clipboard is cleared."
