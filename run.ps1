param(
    [switch]$SkipBuild,
    [switch]$Rebuild,
    [switch]$Reset,
    [switch]$Clean,
    [switch]$Webpack,
    [switch]$NoWarmup,
    [switch]$Preview,
    [int]$ServiceTimeoutSec = 300
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptRoot

$ComposeArgs = @('--env-file', '.env.local', '-f', 'docker-compose.yml')
$RequiredFiles = @(
    'docker-compose.yml',
    'Dockerfile',
    'Dockerfile.frontend',
    'package.json',
    'package-lock.json',
    'ai-service/Dockerfile',
    'ai-service/requirements.txt',
    '.dockerignore',
    '.env.local'
)
$RunningServices = @('ai-service', 'frontend', 'celery-worker')
$BuildRules = @(
    [PSCustomObject]@{
        Service = 'ai-service'
        Image = 'recruitment-platform-ai-service-dev'
        Inputs = @('ai-service/Dockerfile', 'ai-service/requirements.txt', '.dockerignore')
    },
    [PSCustomObject]@{
        Service = 'frontend'
        Image = 'recruitment-platform-frontend'
        Inputs = @('Dockerfile', 'package.json', 'package-lock.json', '.dockerignore')
    }
)
$script:ComposeConfig = $null

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

function Set-FrontendRuntimeMode {
    if ($Preview -and $Webpack) {
        Fail 'Use either -Preview or -Webpack, not both. Preview runs next build/next start; -Webpack is only for dev fallback.'
    }

    if ($Preview) {
        $env:FRONTEND_MODE = 'preview'
        $env:NEXT_DEV_SCRIPT = 'dev:docker'
        Write-Step 'Configure frontend runtime'
        Write-Info 'Frontend mode: preview (next build + standalone start, no hot reload)'
        return
    }

    $env:FRONTEND_MODE = 'dev'
    $env:NEXT_DEV_SCRIPT = if ($Webpack) { 'dev:docker:webpack' } else { 'dev:docker' }

    Write-Step 'Configure frontend runtime'
    if ($Webpack) {
        Write-Info 'Frontend dev compiler: webpack fallback'
    }
    else {
        Write-Info 'Frontend dev compiler: Turbopack'
    }
}

function Require-Command {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        Fail "$Name is not installed or not in PATH."
    }
}

function Invoke-Checked {
    param(
        [Parameter(Mandatory = $true)][string]$Label,
        [Parameter(Mandatory = $true)][scriptblock]$Command
    )

    Write-Info $Label
    & $Command
    if ($LASTEXITCODE -ne 0) {
        Fail "$Label failed."
    }
}

function Invoke-NativeQuiet {
    param([Parameter(Mandatory = $true)][scriptblock]$Command)

    $previousErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        & $Command *> $null
        return $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }
}

function Get-ComposeConfig {
    if ($null -ne $script:ComposeConfig) {
        return $script:ComposeConfig
    }

    $jsonText = (& docker compose @ComposeArgs config --format json | Out-String)
    if ($LASTEXITCODE -ne 0) {
        Fail 'docker compose config --format json failed.'
    }

    $script:ComposeConfig = $jsonText | ConvertFrom-Json
    return $script:ComposeConfig
}

function Get-ObjectPropertyValue {
    param(
        [Parameter(Mandatory = $true)]$Object,
        [Parameter(Mandatory = $true)][string]$Name
    )

    $property = $Object.PSObject.Properties[$Name]
    if ($null -eq $property) {
        return $null
    }

    return $property.Value
}

function Ensure-RepoRoot {
    Write-Step 'Validate repository files'
    foreach ($file in $RequiredFiles) {
        if (-not (Test-Path -LiteralPath $file)) {
            Fail "Required file is missing: $file"
        }
    }
    Write-Info "Working directory: $ScriptRoot"
}

function Ensure-Docker {
    Write-Step 'Check Docker Desktop / Docker daemon'
    Require-Command 'docker'

    if ((Invoke-NativeQuiet { docker info }) -ne 0) {
        Fail 'Docker daemon is not ready. Start Docker Desktop, wait until it finishes booting, then run ./run.ps1 again.'
    }

    if ((Invoke-NativeQuiet { docker compose version }) -ne 0) {
        Fail 'Docker Compose plugin is missing or not working.'
    }

    Write-Info ((& docker compose version) -join ' ')
}

function Test-LocalImagesHaveBuild {
    Write-Step 'Validate compose config'

    & docker compose @ComposeArgs config --quiet
    if ($LASTEXITCODE -ne 0) {
        Fail 'docker compose config --quiet failed.'
    }

    $config = Get-ComposeConfig
    $badServices = @()
    foreach ($service in $config.services.PSObject.Properties) {
        $imageProperty = $service.Value.PSObject.Properties['image']
        $image = if ($null -ne $imageProperty) { [string]$imageProperty.Value } else { '' }
        $hasBuild = $null -ne $service.Value.PSObject.Properties['build']
        if ($image -like 'recruitment-platform-*-dev' -and -not $hasBuild) {
            $badServices += $service.Name
        }
    }

    if ($badServices.Count -gt 0) {
        Fail ("Local dev image services without build: " + ($badServices -join ', '))
    }

    Write-Info 'Compose config is valid; local dev image services all have build definitions.'
}

function Get-FrontendHostPort {
    $defaultPort = 3000
    $config = Get-ComposeConfig
    $servicesProperty = $config.PSObject.Properties['services']
    if ($null -eq $servicesProperty) {
        return $defaultPort
    }

    $frontendProperty = $servicesProperty.Value.PSObject.Properties['frontend']
    if ($null -eq $frontendProperty) {
        return $defaultPort
    }

    $portsProperty = $frontendProperty.Value.PSObject.Properties['ports']
    if ($null -eq $portsProperty) {
        return $defaultPort
    }

    foreach ($portMapping in @($portsProperty.Value)) {
        if ($portMapping -is [string]) {
            if ($portMapping -match '^(?:[^:]+:)?(?<published>\d+):(?<target>3000)(?:/tcp)?$') {
                return [int]$Matches.published
            }
            continue
        }

        $target = Get-ObjectPropertyValue -Object $portMapping -Name 'target'
        $published = Get-ObjectPropertyValue -Object $portMapping -Name 'published'
        $protocol = Get-ObjectPropertyValue -Object $portMapping -Name 'protocol'
        if ([string]::IsNullOrWhiteSpace([string]$protocol)) {
            $protocol = 'tcp'
        }

        if ([string]$target -eq '3000' -and [string]$protocol -eq 'tcp' -and -not [string]::IsNullOrWhiteSpace([string]$published)) {
            return [int]$published
        }
    }

    return $defaultPort
}

function Get-PortListeners {
    param([Parameter(Mandatory = $true)][int]$Port)

    if (-not (Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue)) {
        Fail 'Get-NetTCPConnection is not available in this PowerShell session. Run ./run.ps1 from Windows PowerShell or PowerShell 7 on Windows.'
    }

    $listeners = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
    foreach ($listener in $listeners) {
        $ownerPid = [int]$listener.OwningProcess
        $processName = 'unknown'
        try {
            $process = Get-Process -Id $ownerPid -ErrorAction Stop
            if (-not [string]::IsNullOrWhiteSpace($process.ProcessName)) {
                $processName = $process.ProcessName
                if ($processName -notlike '*.exe') {
                    $processName = "$processName.exe"
                }
            }
        }
        catch {
            $processName = 'unknown'
        }

        [PSCustomObject]@{
            LocalAddress = [string]$listener.LocalAddress
            LocalPort = [int]$listener.LocalPort
            PID = $ownerPid
            ProcessName = $processName
        }
    }
}

function Test-PortOwnedByCurrentComposeFrontend {
    param([Parameter(Mandatory = $true)][int]$Port)

    $containerId = (& docker compose @ComposeArgs ps -q frontend 2>$null | Out-String).Trim()
    if ([string]::IsNullOrWhiteSpace($containerId)) {
        return $false
    }

    $publishedPorts = (& docker compose @ComposeArgs port frontend 3000 2>$null | Out-String).Trim()
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($publishedPorts)) {
        return $false
    }

    foreach ($line in ($publishedPorts -split "\r?\n")) {
        if ($line -match ':(?<port>\d+)$' -and [int]$Matches.port -eq $Port) {
            return $true
        }
    }

    return $false
}

function Test-FrontendPortAvailable {
    Write-Step 'Check frontend host port'
    $frontendPort = Get-FrontendHostPort
    Write-Info "Frontend host port: $frontendPort"

    $listeners = @(Get-PortListeners -Port $frontendPort)
    if ($listeners.Count -eq 0) {
        Write-Info "Port $frontendPort is free."
        return
    }

    if (Test-PortOwnedByCurrentComposeFrontend -Port $frontendPort) {
        Write-Info "Port $frontendPort is already owned by this compose project's frontend service; continuing."
        return
    }

    Write-Host ""
    Write-Host "ERROR: Port $frontendPort is already in use. Docker cannot bind the frontend container to this port." -ForegroundColor Red
    foreach ($listener in $listeners) {
        Write-Host ("  Port {0} is listening on {1} by {2} (PID {3})." -f $listener.LocalPort, $listener.LocalAddress, $listener.ProcessName, $listener.PID) -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "Stop the process that owns the port, then rerun ./run.ps1." -ForegroundColor Yellow
    Write-Host "Suggestions:" -ForegroundColor Yellow
    Write-Host "  - If it is a local Next.js/dev server, stop that terminal with Ctrl+C." -ForegroundColor Yellow
    Write-Host "  - If it is an old Docker dev stack from this repo, run ./stop.ps1." -ForegroundColor Yellow
    Write-Host "  - On Windows, you can run Stop-Process -Id <PID> only if you are sure it is safe." -ForegroundColor Yellow
    exit 1
}

function Reset-StackIfRequested {
    if (-not ($Reset -or $Clean)) {
        return
    }

    Write-Step 'Reset requested: stop stack and remove volumes'
    Invoke-Checked 'docker compose down -v --remove-orphans' {
        docker compose @ComposeArgs down --remove-orphans -v
    }
}

function Get-ImageId {
    param([Parameter(Mandatory = $true)][string]$Image)

    $imageId = (& docker image ls -q $Image 2>$null | Select-Object -First 1)
    if ([string]::IsNullOrWhiteSpace($imageId)) {
        return $null
    }

    return [string]$imageId
}

function Get-ImageCreatedUtc {
    param([Parameter(Mandatory = $true)][string]$Image)

    $createdRaw = (& docker image inspect $Image --format '{{.Created}}' 2>$null | Out-String).Trim()
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($createdRaw)) {
        Fail "Cannot inspect local image timestamp: $Image"
    }

    return ([DateTimeOffset]::Parse($createdRaw)).UtcDateTime
}

function Get-NewerInput {
    param(
        [Parameter(Mandatory = $true)][array]$Inputs,
        [Parameter(Mandatory = $true)][datetime]$ImageCreatedUtc
    )

    foreach ($inputPath in $Inputs) {
        if (-not (Test-Path -LiteralPath $inputPath)) {
            Fail "Build input is missing: $inputPath"
        }

        $item = Get-Item -LiteralPath $inputPath
        if ($item.LastWriteTimeUtc -gt $ImageCreatedUtc) {
            return [string]$inputPath
        }
    }

    return $null
}

function Get-BuildServicesToRun {
    if ($Rebuild) {
        Write-Info 'Rebuild requested -> all local dev images will be rebuilt.'
        return @($BuildRules | ForEach-Object { $_.Service })
    }

    $services = @()
    foreach ($rule in $BuildRules) {
        $imageId = Get-ImageId -Image $rule.Image
        if ([string]::IsNullOrWhiteSpace($imageId)) {
            Write-Info "$($rule.Image) is missing -> build $($rule.Service)"
            $services += $rule.Service
            continue
        }

        $imageCreatedUtc = Get-ImageCreatedUtc -Image $rule.Image
        $newerInput = Get-NewerInput -Inputs $rule.Inputs -ImageCreatedUtc $imageCreatedUtc
        if ($newerInput) {
            Write-Info "$($rule.Image) is older than $newerInput -> build $($rule.Service)"
            $services += $rule.Service
            continue
        }

        Write-Info "$($rule.Image) is current -> skip build"
    }

    return $services
}

function Start-Stack {
    Write-Step 'Build if needed and start full local dev stack'

    if ($SkipBuild) {
        Write-Info 'Build check skipped by -SkipBuild.'
        Invoke-Checked 'docker compose up -d --no-build' {
            docker compose @ComposeArgs up -d --no-build
        }
    }
    else {
        $servicesToBuild = @(Get-BuildServicesToRun)
        if ($servicesToBuild.Count -gt 0) {
            Invoke-Checked ("docker compose build " + ($servicesToBuild -join ' ')) {
                docker compose @ComposeArgs build @servicesToBuild
            }
        }
        else {
            Write-Info 'No Docker image rebuild needed.'
        }

        Invoke-Checked 'docker compose up -d --no-build' {
            docker compose @ComposeArgs up -d --no-build
        }
    }
}

function Wait-ServiceReady {
    param(
        [Parameter(Mandatory = $true)][string]$Service,
        [Parameter(Mandatory = $true)][bool]$RequireHealthy
    )

    $start = Get-Date
    while ($true) {
        $elapsed = ((Get-Date) - $start).TotalSeconds
        if ($elapsed -ge $ServiceTimeoutSec) {
            & docker compose @ComposeArgs logs --tail 120 $Service
            Fail "Timeout waiting for service '$Service'."
        }

        $containerId = (& docker compose @ComposeArgs ps -q $Service | Out-String).Trim()
        if (-not $containerId) {
            Write-Info "Waiting $Service ... container not created yet"
            Start-Sleep -Seconds 3
            continue
        }

        $state = (& docker inspect --format '{{.State.Status}}' $containerId | Out-String).Trim()
        $health = (& docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' $containerId | Out-String).Trim()

        if ($state -ne 'running') {
            & docker compose @ComposeArgs logs --tail 120 $Service
            Fail "Service '$Service' is not running (state=$state)."
        }

        if (-not $RequireHealthy -or $health -eq 'healthy' -or $health -eq 'none') {
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

function Wait-HttpReady {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$Url
    )

    $start = Get-Date
    while ($true) {
        $elapsed = ((Get-Date) - $start).TotalSeconds
        if ($elapsed -ge $ServiceTimeoutSec) {
            Fail "Timeout waiting for $Name at $Url"
        }

        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 10
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
                Write-Info "$Name is reachable: $Url"
                return
            }
        }
        catch {
            Write-Info "Waiting $Name ... $($_.Exception.Message)"
        }

        Start-Sleep -Seconds 3
    }
}

function Wait-TcpReady {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$HostName,
        [Parameter(Mandatory = $true)][int]$Port
    )

    $start = Get-Date
    while ($true) {
        $elapsed = ((Get-Date) - $start).TotalSeconds
        if ($elapsed -ge $ServiceTimeoutSec) {
            Fail "Timeout waiting for $Name at ${HostName}:$Port"
        }

        $client = [System.Net.Sockets.TcpClient]::new()
        try {
            $connect = $client.BeginConnect($HostName, $Port, $null, $null)
            if ($connect.AsyncWaitHandle.WaitOne([TimeSpan]::FromSeconds(2))) {
                $client.EndConnect($connect)
                Write-Info "$Name is accepting TCP connections: ${HostName}:$Port"
                return
            }
        }
        catch {
            Write-Info "Waiting $Name ... $($_.Exception.Message)"
        }
        finally {
            $client.Close()
        }

        Start-Sleep -Seconds 2
    }
}

function Wait-Stack {
    Write-Step 'Wait for services'

    foreach ($service in $RunningServices) {
        Wait-ServiceReady -Service $service -RequireHealthy $false
    }

    $frontendPort = Get-FrontendHostPort
    Wait-TcpReady -Name 'frontend server' -HostName 'localhost' -Port $frontendPort
    Wait-HttpReady -Name 'ai-service health' -Url 'http://localhost:8000/health'
    Wait-HttpReady -Name 'mailpit' -Url 'http://localhost:8025'
}

function Get-HttpStatusFromException {
    param([Parameter(Mandatory = $true)]$ErrorRecord)

    $responseProperty = $ErrorRecord.Exception.PSObject.Properties['Response']
    if ($null -eq $responseProperty) {
        return $null
    }

    $response = $responseProperty.Value
    if ($null -eq $response) {
        return $null
    }

    try {
        return [int]$response.StatusCode
    }
    catch {
        return $null
    }
}

function Invoke-WarmupRoute {
    param(
        [Parameter(Mandatory = $true)][string]$Label,
        [Parameter(Mandatory = $true)][string]$Path
    )

    $frontendPort = Get-FrontendHostPort
    $url = "http://localhost:${frontendPort}${Path}"
    $timer = [System.Diagnostics.Stopwatch]::StartNew()
    $statusCode = $null

    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 90 -MaximumRedirection 0
        $statusCode = [int]$response.StatusCode
    }
    catch {
        $statusCode = Get-HttpStatusFromException -ErrorRecord $_
        if ($null -eq $statusCode) {
            Write-Host ("    warmup {0}: WARN {1} after {2:n1}s" -f $Label, $_.Exception.Message, $timer.Elapsed.TotalSeconds) -ForegroundColor Yellow
            return
        }
    }
    finally {
        $timer.Stop()
    }

    $message = "warmup {0}: HTTP {1} in {2:n1}s" -f $Label, $statusCode, $timer.Elapsed.TotalSeconds
    if ($statusCode -ge 500) {
        Write-Host "    $message" -ForegroundColor Yellow
        return
    }

    Write-Info $message
}

function Warmup-FrontendRoutes {
    if ($NoWarmup) {
        Write-Info 'Route warmup skipped by -NoWarmup.'
        return
    }

    Write-Step 'Warm frontend routes'
    $routes = @(
        [PSCustomObject]@{ Label = 'home'; Path = '/' },
        [PSCustomObject]@{ Label = 'jobs'; Path = '/jobs' },
        [PSCustomObject]@{ Label = 'api jobs'; Path = '/api/jobs?sort=newest&page=1&limit=10' },
        [PSCustomObject]@{ Label = 'recommend jobs'; Path = '/api/recommend-jobs' },
        [PSCustomObject]@{ Label = 'resume list'; Path = '/api/cv-builder/resumes' },
        [PSCustomObject]@{ Label = 'cv options'; Path = '/api/candidate/cv-options' },
        [PSCustomObject]@{ Label = 'cv builder shell'; Path = '/candidate/cv-builder' },
        [PSCustomObject]@{ Label = 'recommended jobs shell'; Path = '/candidate/jobs/recommended' }
    )

    foreach ($route in $routes) {
        Invoke-WarmupRoute -Label $route.Label -Path $route.Path
    }
}

function Print-Status {
    Write-Step 'Compose status'
    & docker compose @ComposeArgs ps
    if ($LASTEXITCODE -ne 0) {
        Fail 'docker compose ps failed.'
    }
}

function Print-Urls {
    Write-Step 'Ready'
    $frontendPort = Get-FrontendHostPort
    $frontendUrl = "http://localhost:$frontendPort"
    Write-Host 'Local dev stack is ready:' -ForegroundColor Green
    Write-Host "  Frontend:          $frontendUrl" -ForegroundColor Green
    Write-Host '  AI service health: http://localhost:8000/health' -ForegroundColor Green
    Write-Host '  Mailpit inbox:     http://localhost:8025' -ForegroundColor Green
    Write-Host '  MongoDB:           mongodb://localhost:27017/recruitment_platform' -ForegroundColor Green
    Write-Host '  Redis:             redis://localhost:6379/0' -ForegroundColor Green
    Write-Host ''
    Write-Host 'Stop with: ./stop.ps1' -ForegroundColor Cyan
    Write-Host 'Reset data with: ./stop.ps1 -Reset' -ForegroundColor Cyan
    Write-Host 'Force rebuild with: ./run.ps1 -Rebuild' -ForegroundColor Cyan
    Write-Host 'Webpack fallback: ./run.ps1 -Webpack' -ForegroundColor Cyan
    Write-Host 'Production preview: ./run.ps1 -Preview' -ForegroundColor Cyan
}

Ensure-RepoRoot
Set-FrontendRuntimeMode
Ensure-Docker
Test-LocalImagesHaveBuild
Reset-StackIfRequested
Test-FrontendPortAvailable
Start-Stack
Wait-Stack
Warmup-FrontendRoutes
Print-Status
Print-Urls
