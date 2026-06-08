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
# Known testnet USDC SAC - used as fallback if CLI lookup fails
$UsdcContractFallback = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA"

function Build-Contracts {
  Write-Host "Building contracts..."
  stellar contract build
  if ($LASTEXITCODE -eq 0) { return }

  Write-Host "MSVC build failed (link.exe missing). Retrying with GNU Rust toolchain..."
  rustup toolchain install stable-x86_64-pc-windows-gnu 2>$null
  rustup target add wasm32v1-none --toolchain stable-x86_64-pc-windows-gnu 2>$null
  $env:RUSTUP_TOOLCHAIN = "stable-x86_64-pc-windows-gnu"
  stellar contract build
  Remove-Item Env:RUSTUP_TOOLCHAIN -ErrorAction SilentlyContinue

  if ($LASTEXITCODE -ne 0) {
    throw @"
Contract build failed.
Install ONE of the following, then re-run this script:
  1. Visual Studio Build Tools with the C++ workload (for MSVC linker)
  2. GNU Rust toolchain:  rustup toolchain install stable-x86_64-pc-windows-gnu
"@
  }
}

Set-Location $Root

# 1. Ensure a funded testnet identity exists
$keys = stellar keys ls
if ($keys -notcontains $Identity) {
  Write-Host "Creating + funding testnet identity '$Identity'..."
  stellar keys generate $Identity --network $Network --fund
}

# 2. Build all contracts to wasm
Build-Contracts

if (-not (Test-Path $Wasm)) {
  throw "WASM not found at $Wasm after build."
}

# 3. Resolve testnet USDC SAC contract ID
Write-Host "Resolving testnet USDC contract ID..."
$UsdcContractId = $UsdcContractFallback
try {
  $UsdcContractId = (stellar contract id asset --asset "USDC:$UsdcIssuer" --network $Network).Trim()
} catch {
  Write-Host "Using fallback USDC SAC: $UsdcContractId"
}
Write-Host "USDC SAC: $UsdcContractId"

# 4. Deploy journalism-paywall to testnet
Write-Host "Deploying journalism-paywall to $Network..."
$ContractId = (stellar contract deploy --wasm $Wasm --source-account $Identity --network $Network).Trim()
if ($LASTEXITCODE -ne 0 -or -not $ContractId.StartsWith("C")) {
  throw "Deploy failed. Output: $ContractId"
}
Write-Host "Deployed contract ID: $ContractId"

# 5. Initialise with USDC token address. Ignore error if already initialised.
Write-Host "Initialising paywall with USDC token..."
try {
  stellar contract invoke --id $ContractId --source-account $Identity --network $Network -- init --token $UsdcContractId
} catch {
  Write-Host "(init skipped - contract may already be initialised)"
}

# 6. Journalist account must have a USDC trustline to receive micropayments.
Write-Host "Adding USDC trustline for journalist account ($Identity)..."
try {
  stellar tx new change-trust --source-account $Identity --line "USDC:$UsdcIssuer" --network $Network
} catch {
  Write-Host "(USDC trustline may already exist on journalist account)"
}

# 7. Write env vars into web\.env.local
if (Test-Path $EnvFile) {
  (Get-Content $EnvFile) | Where-Object {
    $_ -notmatch '^NEXT_PUBLIC_JOURNALISM_CONTRACT_ID=' -and
    $_ -notmatch '^NEXT_PUBLIC_USDC_CONTRACT_ID=' -and
    $_ -notmatch '^NEXT_PUBLIC_USDC_ISSUER='
  } | Set-Content $EnvFile
}
Add-Content $EnvFile "NEXT_PUBLIC_JOURNALISM_CONTRACT_ID=$ContractId"
Add-Content $EnvFile "NEXT_PUBLIC_USDC_CONTRACT_ID=$UsdcContractId"
Add-Content $EnvFile "NEXT_PUBLIC_USDC_ISSUER=$UsdcIssuer"

Write-Host ""
Write-Host "Wrote NEXT_PUBLIC_JOURNALISM_CONTRACT_ID=$ContractId to web\.env.local"
Write-Host "Wrote NEXT_PUBLIC_USDC_CONTRACT_ID=$UsdcContractId to web\.env.local"
Write-Host "Restart npm run dev to pick up the new contract IDs."
