#!/usr/bin/env bash
# Regenerate public/qr.svg, the play-along QR on the desktop intro. Needs qrencode (brew install qrencode).
# Keep URL in step with PLAY_LABEL in src/ui/intro.ts.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
URL="https://wilsonwu-ai.github.io/sundai-hack-148/"
qrencode -t SVG --svg-path -l M -m 2 -s 8 --foreground=0B0B0F --background=FFFFFF -o "$ROOT/public/qr.svg" "$URL"
echo "wrote public/qr.svg for $URL"
