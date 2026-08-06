#!/bin/bash
# Set AI provider env vars on Vercel production.
# Reads comma-separated keys from env vars NIM_KEYS, GROQ_KEYS,
# OPENROUTER_KEYS (set them in your shell, not in this file).
#
# Usage:
#   export NIM_KEYS="nvapi-...,nvapi-..."   # 12 keys
#   export GROQ_KEYS="gsk_...,gsk_..."      # 14 keys
#   export OPENROUTER_KEYS="sk-or-v1-..."   # 10 keys
#   bash scripts/set-prod-env.example.sh
#
# Safe to commit (no raw keys). Multi-key rotation via getKey().

set -euo pipefail

if [ -z "${NIM_KEYS:-}" ] && [ -z "${GROQ_KEYS:-}" ] && [ -z "${OPENROUTER_KEYS:-}" ]; then
  echo "Set at least one of NIM_KEYS / GROQ_KEYS / OPENROUTER_KEYS env vars first."
  exit 1
fi

# Generate CRON_SECRET if not provided
if [ -z "${CRON_SECRET:-}" ]; then
  CRON_SECRET=$(openssl rand -hex 32 2>/dev/null || python -c "import secrets; print(secrets.token_hex(32))")
fi

[ -n "${NIM_KEYS:-}" ]          && vercel env add NIM_API_KEY        production --force --sensitive --yes --value "$NIM_KEYS"
[ -n "${GROQ_KEYS:-}" ]         && vercel env add GROQ_API_KEY       production --force --sensitive --yes --value "$GROQ_KEYS"
[ -n "${OPENROUTER_KEYS:-}" ]   && vercel env add OPENROUTER_API_KEY production --force --sensitive --yes --value "$OPENROUTER_KEYS"
                                   vercel env add CRON_SECRET          production --force --sensitive --yes --value "$CRON_SECRET"

echo "Done. Verify with: vercel env ls production"
