#!/usr/bin/env bash
# Deploy the journalism-paywall contract to Stellar testnet, initialise it with
# the testnet USDC Stellar Asset Contract, then write IDs into web/.env.local.
#
# Usage:  ./scripts/deploy-journalism.sh [identityName]   (default: workshop)
set -euo pipefail

IDENTITY="${1:-workshop}"
NETWORK="testnet"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WASM="target/wasm32v1-none/release/journalism_paywall.wasm"
ENV_FILE="$ROOT/web/.env.local"
USDC_ISSUER="GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"

cd "$ROOT"

if ! stellar keys ls | grep -qx "$IDENTITY"; then
  echo "Creating + funding testnet identity '$IDENTITY'..."
  stellar keys generate "$IDENTITY" --network "$NETWORK" --fund
fi

echo "Building contracts..."
stellar contract build

echo "Resolving testnet USDC contract ID..."
USDC_CONTRACT_ID=$(stellar contract id asset --asset "USDC:${USDC_ISSUER}" --network "$NETWORK")
echo "USDC SAC: $USDC_CONTRACT_ID"

echo "Deploying journalism-paywall to $NETWORK..."
CONTRACT_ID=$(stellar contract deploy \
  --wasm "$WASM" \
  --source-account "$IDENTITY" \
  --network "$NETWORK")
echo "Deployed contract ID: $CONTRACT_ID"

echo "Initialising paywall with USDC token..."
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source-account "$IDENTITY" \
  --network "$NETWORK" \
  -- init --token "$USDC_CONTRACT_ID" || echo "(init skipped — contract may already be initialised)"

echo "Adding USDC trustline for journalist account ($IDENTITY)..."
stellar tx new change-trust \
  --source-account "$IDENTITY" \
  --line "USDC:${USDC_ISSUER}" \
  --network "$NETWORK" || echo "(USDC trustline may already exist)"

set_env_line() {
  local key="$1" val="$2"
  if [ -f "$ENV_FILE" ]; then
    grep -v "^${key}=" "$ENV_FILE" > "$ENV_FILE.tmp" || true
    mv "$ENV_FILE.tmp" "$ENV_FILE"
  fi
  echo "${key}=${val}" >> "$ENV_FILE"
}

set_env_line "NEXT_PUBLIC_JOURNALISM_CONTRACT_ID" "$CONTRACT_ID"
set_env_line "NEXT_PUBLIC_USDC_CONTRACT_ID" "$USDC_CONTRACT_ID"
set_env_line "NEXT_PUBLIC_USDC_ISSUER" "$USDC_ISSUER"

echo ""
echo "Wrote NEXT_PUBLIC_JOURNALISM_CONTRACT_ID=$CONTRACT_ID"
echo "Wrote NEXT_PUBLIC_USDC_CONTRACT_ID=$USDC_CONTRACT_ID"
echo "Restart 'npm run dev' to pick up the new contract IDs."
