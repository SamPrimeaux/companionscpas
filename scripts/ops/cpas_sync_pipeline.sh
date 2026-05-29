#!/usr/bin/env bash
set -euo pipefail

BUCKET="${BUCKET:-companionscpas}"
KV_NAMESPACE_ID="${KV_NAMESPACE_ID:-0b410337a8494fc982ea04c5bde1eab4}"
CONFIG="${CONFIG:-wrangler.toml}"
BASE_URL="${BASE_URL:-https://companionscpas.meauxbility.workers.dev}"

echo "== CompanionsCPAS sync pipeline =="
echo "Bucket: $BUCKET"
echo "KV: $KV_NAMESPACE_ID"
echo "Base URL: $BASE_URL"
echo ""

echo "== git before =="
git status --short
echo ""

echo "== lightweight syntax checks =="
node --check src/index.js
node --check src/api/_shell.js
node --check src/api/render_home.js
[ -f src/api/render_page.js ] && node --check src/api/render_page.js || true
[ -f src/api/render_section.js ] && node --check src/api/render_section.js || true
echo ""

echo "== deploy worker/assets =="
wrangler deploy -c "$CONFIG"
echo ""

if [ -f public/_shared.css ]; then
  echo "== publish global shared.css to R2 =="
  wrangler r2 object put "$BUCKET/static/global/shared.css" \
    --remote \
    --file public/_shared.css \
    --content-type "text/css; charset=utf-8" \
    -c "$CONFIG"
fi

if [ -f public/_shared.js ]; then
  echo "== publish global shared.js to R2 =="
  wrangler r2 object put "$BUCKET/static/global/shared.js" \
    --remote \
    --file public/_shared.js \
    --content-type "application/javascript; charset=utf-8" \
    -c "$CONFIG"
fi

echo ""
echo "== purge remote KV page/brand cache =="
for key in \
  "brand:tenant_companionscpas" \
  "page:/" \
  "page:/home" \
  "page:/about" \
  "page:/adopt" \
  "page:/services" \
  "page:/donate"
do
  wrangler kv key delete "$key" \
    --remote \
    --namespace-id "$KV_NAMESPACE_ID" || true
done

echo ""
echo "== verify public shell contract =="
for route in / /about /adopt /services /donate; do
  echo ""
  echo "===== $route ====="
  curl -s "$BASE_URL$route?v=$(date +%s)" \
    | grep -oE 'href="[^"]*shared[^"]*"|src="[^"]*shared[^"]*"|data-route="[^"]*"|class="site-main"|site-header|/_shared\.css|/_shared\.js' \
    | sort | uniq -c || true
done

echo ""
echo "== verify global assets =="
curl -I "$BASE_URL/static/global/shared.css?v=$(date +%s)" | sed -n '1,12p'
curl -I "$BASE_URL/static/global/shared.js?v=$(date +%s)" | sed -n '1,12p'

echo ""
echo "== git after =="
git status --short
git log --oneline -5
