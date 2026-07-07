#!/bin/bash
# sync-r2.sh — smart diff-based sync to companionscpas R2
# Only uploads files changed since last commit (or explicit subdir).
# Images are managed via the CMS upload endpoint — never synced here.
# Usage:
#   npm run sync          — diff-based: only changed public/ files
#   npm run sync:js       — uploads public/dashboard/js/ only
#   bash scripts/sync-r2.sh public/dashboard/js  — explicit subdir

set -e

BUCKET="companionscpas"
SUBDIR="${1:-}"

# Cross-platform sed
sedi() {
  if sed --version 2>/dev/null | grep -q GNU; then
    sed -i "$@"
  else
    sed -i '' "$@"
  fi
}

# Bake git hash into dashboard/index.html for JSX cache-busting
HASH=$(git rev-parse --short HEAD)
HTML="public/dashboard/index.html"
if [ -f "$HTML" ]; then
  sedi "s|\.jsx?v=[^\"]*|\.jsx|g; s|\.jsx\"|\.jsx?v=${HASH}\"|g; s|dash\.css?v=[^\"]*|dash.css|g; s|dash\.css\"|dash.css?v=${HASH}\"|g" "$HTML"
  echo "Hash baked: $HASH → $HTML"
fi

upload() {
  local file="$1"
  local key="${file#public/}"
  local ext="${file##*.}"

  # Never sync image/media files — those go through the CMS upload endpoint
  case "$ext" in
    webp|jpg|jpeg|png|gif|svg|mp4|webm|mov|pdf) return 0 ;;
  esac

  case "$ext" in
    html)  ct="text/html; charset=utf-8" ;;
    css)   ct="text/css; charset=utf-8" ;;
    js|jsx) ct="application/javascript; charset=utf-8" ;;
    json)  ct="application/json; charset=utf-8" ;;
    ico)   ct="image/x-icon" ;;
    woff2) ct="font/woff2" ;;
    *)     ct="application/octet-stream" ;;
  esac

  echo "  → $key"
  npx wrangler r2 object put "$BUCKET/$key" \
    --file "$file" \
    --content-type "$ct" \
    --remote
}

export -f upload
export BUCKET

if [ -n "$SUBDIR" ]; then
  # Explicit subdir — upload everything in it (no image filter bypass)
  echo "Syncing $SUBDIR/ → R2 $BUCKET ..."
  find "$SUBDIR" -type f | sort | while read -r file; do
    upload "$file"
  done
else
  # Smart diff — only files changed since last commit under public/
  # Falls back to full sync of non-image public/ files if no prior commit
  echo "Diffing against HEAD~1 ..."
  CHANGED=$(git diff --name-only HEAD~1 2>/dev/null | grep "^public/" || true)

  # Always include dashboard/index.html (hash was just baked)
  if ! echo "$CHANGED" | grep -q "public/dashboard/index.html"; then
    CHANGED="public/dashboard/index.html
$CHANGED"
  fi

  if [ -z "$CHANGED" ]; then
    echo "No changed files in public/ — nothing to sync."
    exit 0
  fi

  echo "Changed files:"
  echo "$CHANGED"
  echo "---"

  echo "$CHANGED" | while read -r file; do
    [ -f "$file" ] && upload "$file"
  done
fi

echo "Sync complete."
