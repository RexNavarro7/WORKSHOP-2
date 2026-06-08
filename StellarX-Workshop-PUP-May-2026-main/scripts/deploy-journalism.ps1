# Deploy the journalism-paywall contract to Stellar testnet, initialise it with
# the testnet USDC Stellar Asset Contract, then write IDs into web\.env.local.
#
# Usage:  .\scripts\deploy-journalism.ps1 [identityName]   (default: workshop)

param([string]$Identity = "workshop")

$ErrorActionPreference = "Stop"
$Network = "testnet"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Wasm = "target\wasm32v1-none\release\journalism_paywall.wasm"
$EnvFile = Join-Path $Root "web\.env.local"
$UsdcIssuer = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"

Set-Location $Root

# 1. Ensure a funded testnet identity exists
$keys = stellar keys ls
if ($keys -notcontains $Identity) {
  Write-Host "Creating + funding testnet identity '$Identity'..."
  stellar keys generate $Identity --network $Network --fund
}

# 2. Build all contracts to wasm
Write-Host "Building contracts..."
stellar contract build

# 3. Resolve testnet USDC SAC contract ID
Write-Host "Resolving testnet USDC contract ID..."
$UsdcContractId = (stellar contract id --asset "USDC:$UsdcIssuer" --network $Network).Trim()
Write-Host "USDC SAC: $UsdcContractId"

# 4. Deploy journalism-paywall to testnet
Write-Host "Deploying journalism-paywall to $Network..."
$ContractId = (stellar contract deploy --wasm $Wasm --source-account $Identity --network $Network).Trim()
Write-Host "Deployed contract ID: $ContractId"

# 5. Initialise with USDC token address
Write-Host "Initialising paywall with USDC token..."
try {
  stellar contract invoke --id $ContractId --source-account $Identity --network $Network -- init --token $UsdcContractId
} catch {
  Write-Host "(init skipped — contract may already be initialised)"
}

# 6. Write env vars into web\.env.local
function Set-EnvLine($key, $value) {
  if (Test-Path $EnvFile) {
    (Get-Content $EnvFile) | Where-Object { $_ -notmatch "^$key=" } | Set-Content $EnvFile
  }
  Add-Content $EnvFile "$key=$value"
}

Set-EnvLine "NEXT_PUBLIC_JOURNALISM_CONTRACT_ID" $ContractId
Set-EnvLine "NEXT_PUBLIC_USDC_CONTRACT_ID" $UsdcContractId

Write-Host ""
Write-Host "Wrote NEXT_PUBLIC_JOURNALISM_CONTRACT_ID=$ContractId"
Write-Host "Wrote NEXT_PUBLIC_USDC_CONTRACT_ID=$UsdcContractId"
Write-Host "Restart 'npm run dev' to pick up the new contract IDs."
