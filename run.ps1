param(
    [switch]$SkipBuild,
    [switch]$Clean,
    [int]$ServiceTimeoutSec = 300
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptRoot

$ComposeArgs = @('--env-file', '.env.local', '-f', 'docker-compose.prod.yml')
$CanonicalLocalOrigin = 'http://localhost:3000'
$CanonicalLocalOriginWithSlash = "$CanonicalLocalOrigin/"
$RequiredEnvKeys = @(
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'APP_URL',
    'NEXT_PUBLIC_APP_URL',
    'NEXT_PUBLIC_BASE_URL'
)
$LocalOriginKeys = @('APP_URL', 'NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_BASE_URL')

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

function Ensure-Docker {
    Write-Step '1/10 Check Docker daemon'
    Require-Command 'docker'

    & docker info *> $null
    if ($LASTEXITCODE -ne 0) {
        Fail 'Docker daemon is not running. Start Docker Desktop and run again.'
    }

    & docker compose version *> $null
    if ($LASTEXITCODE -ne 0) {
        Fail 'docker compose plugin is missing.'
    }

    Write-Info 'Docker is ready.'
}

function Ensure-NodeVersion {
    Write-Step '2/10 Check Node.js version (>=22)'
    Require-Command 'node'

    $versionRaw = (& node -v).Trim()
    if (-not $versionRaw) {
        Fail 'Cannot read Node.js version.'
    }

    $match = [regex]::Match($versionRaw, '^v?(\d+)\.')
    if (-not $match.Success) {
        Fail "Unexpected Node.js version format: $versionRaw"
    }

    $major = [int]$match.Groups[1].Value
    if ($major -lt 22) {
        Fail "Node.js >=22 required. Current: $versionRaw"
    }

    Write-Info "Node version OK: $versionRaw"
}

function Ensure-Dependencies {
    Write-Step '3/10 Install dependencies if missing'
    Require-Command 'npm'

    if (-not (Test-Path -LiteralPath 'package-lock.json')) {
        Fail 'package-lock.json not found. Please run from repository root.'
    }

    $nextCmdPath = Join-Path $ScriptRoot 'node_modules/.bin/next.cmd'
    $nextBinPath = Join-Path $ScriptRoot 'node_modules/.bin/next'

    $needsInstall = $false
    $installReason = ''

    if (-not (Test-Path -LiteralPath 'node_modules')) {
        $needsInstall = $true
        $installReason = 'node_modules not found'
    }
    elseif ((-not (Test-Path -LiteralPath $nextCmdPath)) -and (-not (Test-Path -LiteralPath $nextBinPath))) {
        $needsInstall = $true
        $installReason = 'next binary missing in node_modules/.bin'
    }

    if ($needsInstall) {
        $frontendContainer = (& docker compose @ComposeArgs ps -q frontend 2>$null | Out-String).Trim()
        if ($frontendContainer) {
            Write-Info 'Detected running compose stack -> stopping temporarily to avoid file locks'
            & docker compose @ComposeArgs down --remove-orphans
            if ($LASTEXITCODE -ne 0) {
                Fail 'Failed to stop running compose stack before dependency install.'
            }
        }

        if ((Test-Path -LiteralPath 'node_modules') -and ($installReason -eq 'next binary missing in node_modules/.bin')) {
            Write-Info "$installReason -> trying npm install first"
            & npm install --no-audit --no-fund
            if ($LASTEXITCODE -eq 0) {
                $hasNextAfterInstall = (Test-Path -LiteralPath $nextCmdPath) -or (Test-Path -LiteralPath $nextBinPath)
                if ($hasNextAfterInstall) {
                    Write-Info 'Dependencies repaired with npm install.'
                    return
                }
            }
            Write-Info 'npm install could not repair dependencies -> falling back to npm ci'
        }

        Write-Info "$installReason -> running npm ci"
        & npm ci
        if ($LASTEXITCODE -ne 0) {
            Write-Info 'npm ci failed -> retrying once after cleaning node_modules and npm cache verify'

            if (Test-Path -LiteralPath 'node_modules') {
                Remove-Item -LiteralPath 'node_modules' -Recurse -Force -ErrorAction SilentlyContinue
            }

            & npm cache verify *> $null
            & npm ci
            if ($LASTEXITCODE -ne 0) {
                Fail 'npm ci failed after retry. Close apps locking node_modules (editor/antivirus), then run again.'
            }
        }
        Write-Info 'Dependencies installed.'
    }
    else {
        Write-Info 'Dependencies already installed -> skip npm ci'
    }
}

function Read-EnvMap {
    param([string]$Path)

    $map = @{}
    $lines = Get-Content -LiteralPath $Path

    foreach ($rawLine in $lines) {
        $line = $rawLine.Trim()
        if (-not $line) { continue }
        if ($line.StartsWith('#')) { continue }

        $eqIndex = $line.IndexOf('=')
        if ($eqIndex -lt 1) { continue }

        $key = $line.Substring(0, $eqIndex).Trim()
        $value = $line.Substring($eqIndex + 1).Trim()

        if ($key) {
            $map[$key] = $value
        }
    }

    return $map
}

function Normalize-Origin {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return $null
    }

    $candidate = $Value.Trim()
    $uri = $null
    if (-not [System.Uri]::TryCreate($candidate, [System.UriKind]::Absolute, [ref]$uri)) {
        return $null
    }

    $normalizedHost = $uri.Host.ToLowerInvariant()
    if ($normalizedHost -eq 'localhost' -or $normalizedHost -eq '0.0.0.0' -or $normalizedHost -eq '127.0.0.1') {
        return $CanonicalLocalOrigin
    }

    $builder = New-Object System.UriBuilder($uri)
    if (($builder.Scheme -eq 'http' -and $builder.Port -eq 80) -or ($builder.Scheme -eq 'https' -and $builder.Port -eq 443)) {
        $builder.Port = -1
    }

    return $builder.Uri.GetLeftPart([System.UriPartial]::Authority).TrimEnd('/')
}

function Ensure-EnvFile {
    Write-Step '4/10 Validate .env.local'

    if (-not (Test-Path -LiteralPath '.env.local')) {
        Fail '.env.local not found. Create it from .env.example first.'
    }

    $envMap = Read-EnvMap -Path '.env.local'
    $missing = @()

    foreach ($key in $RequiredEnvKeys) {
        if (-not $envMap.ContainsKey($key)) {
            $missing += $key
            continue
        }

        $value = [string]$envMap[$key]
        if ([string]::IsNullOrWhiteSpace($value) -or $value -eq '""' -or $value -eq "''") {
            $missing += $key
        }
    }

    if ($missing.Count -gt 0) {
        Fail ("Missing required .env.local keys: " + ($missing -join ', '))
    }

    $originMismatches = @()
    foreach ($key in $LocalOriginKeys) {
        $normalizedValue = Normalize-Origin -Value ([string]$envMap[$key])
        if ($normalizedValue -ne $CanonicalLocalOrigin) {
            $originMismatches += "$key=$($envMap[$key])"
        }
    }

    if ($originMismatches.Count -gt 0) {
        Fail (
            "Local URL keys must point to $CanonicalLocalOrigin. Mismatched values: " +
            ($originMismatches -join ', ')
        )
    }

    Write-Info 'Required env keys are present.'
}

function Build-NextApp {
    Write-Step '5/10 Build Next.js production'

    if (Test-Path -LiteralPath '.next') {
        Write-Info 'Clearing .next cache to avoid stale route/type artifacts from dev mode'
        try {
            Remove-Item -LiteralPath '.next' -Recurse -Force -ErrorAction Stop
        }
        catch {
            Fail "Could not remove .next cache ($($_.Exception.Message)). Stop any running next dev process and retry."
        }
    }

    & npm run build
    if ($LASTEXITCODE -ne 0) {
        Fail 'npm run build failed.'
    }
    Write-Info 'Next.js production build completed.'
}

function Build-DockerImages {
    Write-Step '6/10 Build Docker images'
    & docker compose @ComposeArgs build
    if ($LASTEXITCODE -ne 0) {
        Write-Info 'docker compose build failed -> pruning builder cache and retrying once'
        & docker builder prune -af
        if ($LASTEXITCODE -ne 0) {
            Fail 'docker builder prune failed.'
        }

        & docker compose @ComposeArgs build
        if ($LASTEXITCODE -ne 0) {
            Fail 'docker compose build failed after retry.'
        }
    }
    Write-Info 'Docker images built.'
}

function Start-Compose {
    Write-Step '7/10 Start docker-compose.prod.yml'
    & docker compose @ComposeArgs up -d
    if ($LASTEXITCODE -ne 0) {
        Fail 'docker compose up failed.'
    }
    Write-Info 'Compose stack started.'
}

function Wait-ServiceHealthy {
    param(
        [Parameter(Mandatory = $true)][string]$Service,
        [Parameter(Mandatory = $true)][int]$TimeoutSec
    )

    $start = Get-Date

    while ($true) {
        $elapsed = ((Get-Date) - $start).TotalSeconds
        if ($elapsed -ge $TimeoutSec) {
            & docker compose @ComposeArgs logs --tail 120 $Service
            Fail "Timeout waiting for service '$Service' to become healthy."
        }

        $containerId = (& docker compose @ComposeArgs ps -q $Service).Trim()
        if (-not $containerId) {
            Write-Info "Waiting $Service ... container not created yet"
            Start-Sleep -Seconds 3
            continue
        }

        $state = (& docker inspect --format '{{.State.Status}}' $containerId).Trim()
        $health = (& docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' $containerId).Trim()

        if ($state -ne 'running') {
            & docker compose @ComposeArgs logs --tail 120 $Service
            Fail "Service '$Service' is not running (state=$state)."
        }

        if ($health -eq 'healthy' -or $health -eq 'none') {
            Write-Info "$Service is $state / $health"
            return
        }

        if ($health -eq 'unhealthy') {
            & docker compose @ComposeArgs logs --tail 120 $Service
            Fail "Service '$Service' is unhealthy."
        }

        Write-Info "Waiting $Service ... state=$state health=$health"
        Start-Sleep -Seconds 3
    }
}

function Wait-AllServices {
    Write-Step '8/10 Wait for healthy services (frontend, nginx, redis, mongodb, ai-service, mailpit)'

    $services = @('frontend', 'nginx', 'redis', 'mongodb', 'ai-service', 'mailpit')
    foreach ($service in $services) {
        Wait-ServiceHealthy -Service $service -TimeoutSec $ServiceTimeoutSec
    }
}

function Assert-Http200 {
    param(
        [Parameter(Mandatory = $true)][string]$Url,
        [int]$Retries = 20,
        [int]$DelaySec = 3
    )

    for ($i = 1; $i -le $Retries; $i++) {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 15
            if ($response.StatusCode -eq 200) {
                Write-Info "$Url -> 200"
                return
            }
        }
        catch {
            if ($i -eq $Retries) {
                Fail "Health check failed for $Url : $($_.Exception.Message)"
            }
        }

        Write-Info "Retry $i/$Retries for $Url"
        Start-Sleep -Seconds $DelaySec
    }

    Fail "Health check failed for $Url"
}

function Check-HealthEndpoints {
    Write-Step '9/10 Test health endpoints'
    Assert-Http200 -Url $CanonicalLocalOriginWithSlash
    Assert-Http200 -Url "$CanonicalLocalOrigin/healthz"
    Assert-Http200 -Url "$CanonicalLocalOrigin/api/health"
    Assert-Http200 -Url 'http://localhost:8025'
}

function Print-FinalOutput {
    Write-Step '10/10 Ready'
    Write-Host 'Project is running at:' -ForegroundColor Green
    Write-Host $CanonicalLocalOriginWithSlash -ForegroundColor Green
    Write-Host 'Mailpit inbox is running at:' -ForegroundColor Green
    Write-Host 'http://localhost:8025' -ForegroundColor Green
}

if ($Clean) {
    Write-Step 'Clean mode: remove old stack first'
    & docker compose @ComposeArgs down --remove-orphans -v
    if ($LASTEXITCODE -ne 0) {
        Fail 'Clean step failed (docker compose down).'
    }
    Write-Info 'Old stack removed.'
}

Ensure-Docker
Ensure-NodeVersion
Ensure-Dependencies
Ensure-EnvFile

if ($SkipBuild) {
    Write-Step '5/10 + 6/10 Skip build steps (-SkipBuild)'
    Write-Info 'Skipping Next.js build and Docker image build.'
}
else {
    Build-NextApp
    Build-DockerImages
}

Start-Compose
Wait-AllServices
Check-HealthEndpoints
Print-FinalOutput
