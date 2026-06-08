# Add a USDC trustline to the journalist (workshop) account so it can receive
# article micropayments. Run this once if unlock fails with "trustline missing".
#
# Usage:  .\scripts\setup-journalist.ps1 [identityName]   (default: workshop)

param([string]$Identity = "workshop")

$Network = "testnet"
$UsdcIssuer = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"

Write-Host "Adding USDC trustline for journalist account: $Identity"
stellar tx new change-trust --source-account $Identity --line "USDC:$UsdcIssuer" --network $Network
Write-Host "Done. Journalist can now receive USDC payments."
