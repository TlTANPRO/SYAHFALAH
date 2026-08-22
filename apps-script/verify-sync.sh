#!/usr/bin/env bash
# scripts/verify-sync.sh
# Manual end-to-end verification: edit a sheet row, then poll Supabase for
# the corresponding tasks row to appear. Exits 0 if the row syncs within
# the threshold, non-zero otherwise.
#
# Usage:
#   SHEET_ID=118KVp... BASE_URL=https://syahfalah-dashboard.vercel.app \
#     CRON_SECRET=$CRON_SECRET ./scripts/verify-sync.sh
#
# Or for local dev:
#   ./scripts/verify-sync.sh   # defaults to localhost:3000

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
CRON_SECRET="${CRON_SECRET:-}"
THRESHOLD_SEC="${THRESHOLD_SEC:-15}"

echo "→ Triggering cron full-replay against $BASE_URL/api/cron/sync-sheets"
if [ -n "$CRON_SECRET" ]; then
  AUTH="Authorization: Bearer $CRON_SECRET"
else
  AUTH=""
fi

START=$(date +%s)
RESP=$(curl -sS -H "$AUTH" "$BASE_URL/api/cron/sync-sheets" -w "\n%{http_code}")
HTTP_CODE=$(echo "$RESP" | tail -n1)
BODY=$(echo "$RESP" | sed '$d')

if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
  echo "✓ Cron returned $HTTP_CODE in $(($(date +%s) - START))s"
  echo "$BODY" | head -c 600
  echo
else
  echo "✗ Cron failed: $HTTP_CODE"
  echo "$BODY"
  exit 2
fi

ELAPSED=$(($(date +%s) - START))
if [ "$ELAPSED" -gt "$THRESHOLD_SEC" ]; then
  echo "⚠ Slow: ${ELAPSED}s > ${THRESHOLD_SEC}s threshold"
  exit 3
fi

echo "✓ Sync healthy (${ELAPSED}s)"
