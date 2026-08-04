#!/usr/bin/env bash
# Convert Markdown → Word (.docx) with full-width tables.
#
# The converter (@mohtasham/md-to-docx) emits tables at page width but sets every
# column to 100 twips (~1.8mm), so Word wraps one character per line. This script
# converts, then runs scripts/fix-docx-tables.py to redistribute columns.
#
# Usage:
#   ./scripts/md-to-docx.sh docs/prd.md docs/prd.docx docs/prd-docx-options.json
#   ./scripts/md-to-docx.sh docs/information-architecture.md \
#       docs/information-architecture.docx docs/ia-docx-options.json
#   ./scripts/md-to-docx.sh docs/foo.md
#
# Options JSON is optional. See docs/md-to-docx.md.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

INPUT="${1:?Usage: $0 <input.md> [output.docx] [options.json]}"
OUTPUT="${2:-${INPUT%.md}.docx}"
OPTIONS="${3:-}"
PKG_VERSION="${MD_TO_DOCX_VERSION:-3.0.1}"
CACHE="${MD_TO_DOCX_CACHE:-${XDG_CACHE_HOME:-$HOME/.cache}/apas-md-to-docx}"

if [[ ! -f "$INPUT" ]]; then
  echo "error: input not found: $INPUT" >&2
  exit 1
fi

if [[ -n "$OPTIONS" && ! -f "$OPTIONS" ]]; then
  echo "error: options file not found: $OPTIONS" >&2
  exit 1
fi

CLI="$CACHE/node_modules/.bin/md-to-docx"
if [[ ! -x "$CLI" ]]; then
  echo "Installing @mohtasham/md-to-docx@$PKG_VERSION into $CACHE …"
  mkdir -p "$CACHE"
  if [[ ! -f "$CACHE/package.json" ]]; then
    printf '{"name":"apas-md-to-docx-cache","private":true}\n' >"$CACHE/package.json"
  fi
  (cd "$CACHE" && npm install --no-fund --no-audit "@mohtasham/md-to-docx@$PKG_VERSION")
fi

TMP="$(mktemp -t md-to-docx.XXXXXX.md)"
cleanup() { rm -f "$TMP"; }
trap cleanup EXIT

# Inject a Word TOC marker after the first horizontal rule, if none exists.
python3 - "$INPUT" "$TMP" <<'PY'
from pathlib import Path
import sys
src, dst = Path(sys.argv[1]), Path(sys.argv[2])
text = src.read_text()
if "[TOC]" not in text:
    parts = text.split("\n---\n", 1)
    text = (
        parts[0] + "\n---\n\n[TOC]\n\n" + parts[1]
        if len(parts) == 2
        else "[TOC]\n\n" + text
    )
dst.write_text(text)
PY

echo "Converting $INPUT → $OUTPUT"
if [[ -n "$OPTIONS" ]]; then
  "$CLI" "$TMP" "$OUTPUT" --options "$OPTIONS"
else
  "$CLI" "$TMP" "$OUTPUT"
fi

python3 "$ROOT/scripts/fix-docx-tables.py" "$OUTPUT"
echo "Done: $OUTPUT"
