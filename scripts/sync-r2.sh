#!/bin/bash
# sync-r2.sh — uploads public/ (or a subdirectory) to companionscpas R2 bucket
# Always bakes the current git hash into dashboard/index.html before uploading.
# Usage:
#   npm run sync          — uploads entire public/ dir
#   npm run sync:js       — uploads public/dashboard/js/ only
#   bash scripts/sync-r2.sh public/dashboard/js  — explicit subdir

set -e

BUCKET="companionscpas"
PUBLIC="${1:-public}"

# Always bake the current git hash into dashboard/index.html so JSX cache-busting works
HASH=$(git rev-parse --short HEAD)
HTML="public/dashboard/index.html"
if [ -f "$HTML" ]; then
  sed -i '' "s|\.jsx?v=[^\"]*|\.jsx|g; s|\.jsx\"|\.jsx?v=${HASH}\"|g; s|dash\.css?v=[^\"]*|dash.css|g; s|dash\.css\"|dash.css?v=${HASH}\"|g" "$HTML"
  echo "Hash baked: $HASH → $HTML"
  # Always push index.html even when syncing a subdirectory
  npx wrangler r2 object put "$BUCKET/dashboard/index.html" \
    --file "$HTML" \
    --content-type "text/html; charset=utf-8" \
    --remote
  echo "  → dashboard/index.html (forced)"
fi

echo "Syncing $PUBLIC/ → R2 $BUCKET ..."

upload() {
  local file="$1"
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
  npx wrangler r2 object put "$BUCKET/$key" \
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
