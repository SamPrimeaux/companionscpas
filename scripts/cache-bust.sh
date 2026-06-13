#!/bin/bash
# Bust KV page cache for all public routes
# Usage: npm run cache:bust
# Usage (single): npm run cache:bust -- /adopt

KV_NS="0b410337a8494fc982ea04c5bde1eab4"

ROUTES=("/" "/about" "/adopt" "/services" "/donate" "/community")

if [ -n "$1" ]; then
  ROUTES=("$1")
fi

for route in "${ROUTES[@]}"; do
  key="page:${route}"
  echo -n "  busting $key ... "
  wrangler kv key delete "$key" --namespace-id=$KV_NS --remote 2>&1 | grep -E "Deleting|Error" || echo "not cached"
done

echo "Cache bust complete."
