#!/bin/zsh
export $(grep -v '^#' .dev.vars | xargs)
echo "Using TOKEN auth for Companions CPAS"
echo "Account: $CLOUDFLARE_ACCOUNT_ID"

# Local-only secrets for scripts / AgentSam tooling
if [ -f ".local.env" ]; then
  source ".local.env"
fi
