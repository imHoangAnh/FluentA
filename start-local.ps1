#Requires -Version 7.0
[CmdletBinding()]
param(
    [switch]$Stop,
    [switch]$Logs
)

$ErrorActionPreference = 'Stop'
$repoRoot = $PSScriptRoot
$composeFile = Join-Path $repoRoot 'docker-compose.local.yml'
$secretsFile = Join-Path $env:APPDATA 'Microsoft/UserSecrets/FluentA-Api-Local-Auth/secrets.json'
$previousSecretsPath = $env:FLUENTA_USER_SECRETS_FILE
$previousFrontendHash = $env:FLUENTA_FRONTEND_ENV_SHA

function Invoke-Checked {
    param([string]$Command, [string[]]$Arguments)
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$Command failed (exit code $LASTEXITCODE)."
    }
}

try {
    # This variable contains a file path, never the secret values.
    $env:FLUENTA_USER_SECRETS_FILE = $secretsFile.Replace('\', '/')

    if ($Stop -and $Logs) { throw 'Use either -Stop or -Logs.' }

    if ($Logs) {
        Invoke-Checked docker @('compose', '-f', $composeFile, 'logs', '--tail', '100', 'api', 'frontend', 'migrations')
        return
    }

    if ($Stop) {
        Invoke-Checked docker @('compose', '-f', $composeFile, 'stop')
        Write-Host 'Local containers stopped. PostgreSQL data is retained.'
        return
    }

    if (-not (Test-Path -LiteralPath $secretsFile -PathType Leaf)) {
        throw 'Backend user-secrets are missing. Follow docs/local-development.md first.'
    }
    if (-not (Test-Path -LiteralPath (Join-Path $repoRoot 'src/frontend/.env') -PathType Leaf)) {
        throw 'src/frontend/.env is missing. Follow docs/local-development.md first.'
    }
    # BuildKit does not invalidate cache when secret contents change.
    $env:FLUENTA_FRONTEND_ENV_SHA = (Get-FileHash -LiteralPath (Join-Path $repoRoot 'src/frontend/.env') -Algorithm SHA256).Hash

    Invoke-Checked docker @('info', '--format', '{{.ServerVersion}}')
    Invoke-Checked dotnet @('dev-certs', 'https', '--trust')

    $certDirectory = Join-Path $repoRoot '.local-docker/certs'
    New-Item -ItemType Directory -Force -Path $certDirectory | Out-Null
    Invoke-Checked dotnet @(
        'dev-certs', 'https', '--export-path', (Join-Path $certDirectory 'localhost.pem'),
        '--format', 'PEM', '--no-password'
    )

    Invoke-Checked docker @('compose', '-f', $composeFile, 'config', '--quiet')
    Invoke-Checked docker @('compose', '-f', $composeFile, 'up', '--build', '--detach')

    $ready = $false
    for ($attempt = 0; $attempt -lt 45; $attempt++) {
        try {
            $response = Invoke-WebRequest 'https://localhost:7000/health/ready' -TimeoutSec 5
            if ($response.StatusCode -eq 200) {
                $ready = $true
                break
            }
        } catch {
            Start-Sleep -Seconds 2
        }
    }
    if (-not $ready) {
        throw 'API readiness failed. Check: ./start-local.ps1 -Logs'
    }

    foreach ($url in @('https://localhost:5173/', 'https://localhost:5173/settings/practice')) {
        Invoke-WebRequest $url -TimeoutSec 10 | Out-Null
    }
    Write-Host 'Ready: https://localhost:5173'
    Write-Host 'API: https://localhost:7000'
    Write-Host 'Stop without deleting data: ./start-local.ps1 -Stop'
} finally {
    $env:FLUENTA_USER_SECRETS_FILE = $previousSecretsPath
    $env:FLUENTA_FRONTEND_ENV_SHA = $previousFrontendHash
}
