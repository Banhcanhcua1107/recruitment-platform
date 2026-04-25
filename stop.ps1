param(
    [switch]$Reset,
    [switch]$Prune
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptRoot

$ComposeArgs = @('--env-file', '.env.local', '-f', 'docker-compose.yml')
$ProjectImages = @(
    'recruitment-platform-ai-service-dev',
    'recruitment-platform-frontend'
)

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Write-Info {
    param([string]$Message)
    Write-Host "    $Message" -ForegroundColor DarkGray
}

function Fail {
    param([string]$Message)
    Write-Host ""
    Write-Host "ERROR: $Message" -ForegroundColor Red
    exit 1
}

function Require-Command {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        Fail "$Name is not installed or not in PATH."
    }
}

Write-Step 'Check Docker'
Require-Command 'docker'

& docker info *> $null
if ($LASTEXITCODE -ne 0) {
    Fail 'Docker daemon is not ready. Start Docker Desktop if you need to stop a running stack.'
}

if (-not (Test-Path -LiteralPath 'docker-compose.yml')) {
    Fail 'docker-compose.yml not found. Run this script from the repository root or keep it beside docker-compose.yml.'
}

if (-not (Test-Path -LiteralPath '.env.local')) {
    Fail '.env.local not found. It is required by docker-compose.yml.'
}

$downArgs = @('down', '--remove-orphans')
if ($Reset) {
    $downArgs += '-v'
}
if ($Prune) {
    $downArgs += '--rmi'
    $downArgs += 'local'
}

Write-Step 'Stop local dev stack'
Write-Info ("docker compose " + (($ComposeArgs + $downArgs) -join ' '))
& docker compose @ComposeArgs @downArgs
if ($LASTEXITCODE -ne 0) {
    Fail 'docker compose down failed.'
}

if ($Prune) {
    Write-Step 'Prune project dev images and builder cache'
    foreach ($image in $ProjectImages) {
        $imageId = (& docker image ls -q $image 2>$null | Select-Object -First 1)
        if ([string]::IsNullOrWhiteSpace($imageId)) {
            Write-Info "Image $image not found -> skip"
            continue
        }

        Write-Info "Removing image $image"
        & docker image rm $image
        if ($LASTEXITCODE -ne 0) {
            Fail "Failed to remove image $image."
        }
    }

    & docker builder prune -f
    if ($LASTEXITCODE -ne 0) {
        Fail 'docker builder prune failed.'
    }
}

Write-Host ""
if ($Reset) {
    Write-Host 'Stack stopped and named volumes were removed.' -ForegroundColor Green
}
else {
    Write-Host 'Stack stopped. Volumes/data were preserved.' -ForegroundColor Green
}

if ($Prune) {
    Write-Host 'Project dev images and Docker builder cache were pruned.' -ForegroundColor Green
}
