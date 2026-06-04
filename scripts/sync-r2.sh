#!/bin/bash
# sync-r2.sh — uploads public/ (or a subdirectory) to companionscpas R2 bucket
# Usage:
#   npm run sync          — uploads entire public/ dir
#   npm run sync:js       — uploads public/dashboard/js/ only
#   bash scripts/sync-r2.sh public/dashboard/js  — explicit subdir

set -e

BUCKET="companionscpas"
PUBLIC="${1:-public}"

echo "Syncing $PUBLIC/ → R2 $BUCKET ..."

upload() {
  local file="$1"
  # Strip leading public/ prefix for the R2 key
  local key="${file#public/}"
  local ext="${file##*.}"

  case "$ext" in
    html)     ct="text/html; charset=utf-8" ;;
    css)      ct="text/css; charset=utf-8" ;;
    js|jsx)   ct="application/javascript; charset=utf-8" ;;
    json)     ct="application/json; charset=utf-8" ;;
    png)      ct="image/png" ;;
    webp)     ct="image/webp" ;;
    jpg|jpeg) ct="image/jpeg" ;;
    svg)      ct="image/svg+xml" ;;
    ico)      ct="image/x-icon" ;;
    woff2)    ct="font/woff2" ;;
    *)        ct="application/octet-stream" ;;
  esac

  echo "  → $key"
  wrangler r2 object put "$BUCKET/$key" \
    --file "$file" \
    --content-type "$ct" \
    --remote
}

export -f upload
export BUCKET

find "$PUBLIC" -type f | sort | while read -r file; do
  upload "$file"
done

echo "Sync complete."
