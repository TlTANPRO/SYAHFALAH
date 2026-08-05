#!/bin/bash
# scripts/post-deploy-cleanup.sh
# Removes auto-generated Vercel team/user/branch aliases that Vercel
# creates on every production deployment. Keep only the canonical
# syahfalah-dashboard.vercel.app alias.
#
# Why: Vercel auto-creates these per deploy (server-side, NOT disabled
# by --skip-domain — that flag only affects custom domains like your.com):
#   - syahfalah-dashboard-titan-0fab.vercel.app       (team-slug)
#   - syahfalah-dashboard-{userId}-titan-0fab.vercel.app (user-slug)
#   - syahfalah-dashboard-git-master-titan-0fab.vercel.app (branch-aware)
#
# The canonical syahfalah-dashboard.vercel.app alias is what users
# should hit. All extra aliases point to the same deployment, so this
# is purely cosmetic noise — but it makes the dashboard confusing.
#
# This script is invoked by `pnpm run deploy:prod` automatically. It
# can also be run standalone: ./scripts/post-deploy-cleanup.sh

set -e

# Detect user slug + team slug via `vercel whoami` (works on Windows + POSIX)
WHOAMI_JSON=$(npx --no-install vercel whoami --format json 2>/dev/null || echo "{}")
USER_SLUG=$(echo "$WHOAMI_JSON" | python -c "
import json, sys
try:
    d = json.loads(sys.stdin.read())
    print(d.get('username','') or '')
except Exception:
    print('')
" 2>/dev/null)
TEAM_SLUG=$(echo "$WHOAMI_JSON" | python -c "
import json, sys
try:
    d = json.loads(sys.stdin.read())
    print((d.get('team') or {}).get('slug','') or '')
except Exception:
    print('')
" 2>/dev/null)

# Fallbacks (for offline / pre-auth scenarios)
if [ -z "$USER_SLUG" ] && [ -f "${HOME}/.vercel/auth.json" ]; then
  USER_SLUG=$(python -c "import json; print(json.load(open('${HOME}/.vercel/auth.json')).get('user',{}).get('id','') or '')" 2>/dev/null || true)
fi
if [ -z "$TEAM_SLUG" ]; then
  TEAM_SLUG="titan-0fab"  # known team from current setup
fi

echo "Removing auto-generated aliases (team=$TEAM_SLUG, user=$USER_SLUG)…"

# Patterns to remove
PATTERNS=(
  "syahfalah-dashboard-${TEAM_SLUG}.vercel.app"
  "syahfalah-dashboard-git-master-${TEAM_SLUG}.vercel.app"
  "syahfalah-dashboard-git-master-titan-${TEAM_SLUG}.vercel.app"
)

if [ -n "$USER_SLUG" ]; then
  PATTERNS+=("syahfalah-dashboard-${USER_SLUG}-${TEAM_SLUG}.vercel.app")
fi

for alias in "${PATTERNS[@]}"; do
  echo "  removing: $alias"
  if npx --no-install vercel alias remove "$alias" --yes 2>&1 | grep -qE "Success!|Error.*not found"; then
    :
  fi
done

echo ""
echo "Remaining aliases:"
npx --no-install vercel alias list 2>&1 | grep -E "syahfalah-dashboard" || echo "  (none)"
