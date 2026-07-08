#!/bin/bash
# Also purge CF edge cache for brand tokens — max-age=120 means stale colors survive KV busts otherwise
ZONE_ID="1fc12e66840f552578553108ada5e126"
if [ -n "$CLOUDFLARE_API_TOKEN" ]; then
  curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"files":["https://companionsofcaddo.org/api/cms/brand/tokens.css"]}' \
    --silent --output /dev/null
  echo "CF edge cache purged for tokens.css"
fi
# Bust KV page cache for all public routes
# Usage: npm run cache:bust
# Single page: npm run cache:bust -- /adopt

KV_NS="0b410337a8494fc982ea04c5bde1eab4"
ROUTES=("/" "/about" "/adopt" "/services" "/donate" "/community" "/contact")

if [ -n "$1" ]; then
  ROUTES=("$1")
fi

for route in "${ROUTES[@]}"; do
  key="page:${route}"
  printf "  busting %s ... " "$key"
  wrangler kv key delete "$key" --namespace-id=$KV_NS --remote 2>&1 | grep -oE "Deleting|not found|Error[^$]*" || printf "done"
  printf "\n"
done

echo "Cache bust complete."
