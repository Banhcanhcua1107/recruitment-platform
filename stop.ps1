$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptRoot

$ComposeArgs = @('--env-file', '.env.local', '-f', 'docker-compose.prod.yml')

Write-Host 'Stopping docker-compose.prod.yml stack...' -ForegroundColor Cyan
& docker compose @ComposeArgs down --remove-orphans
if ($LASTEXITCODE -ne 0) {
    Write-Host 'ERROR: Failed to stop stack.' -ForegroundColor Red
    exit 1
}

Write-Host 'Stack stopped.' -ForegroundColor Green
