[CmdletBinding()]
param(
    [switch]$Detach
)

$ErrorActionPreference = 'Stop'

$composePath = Join-Path $PSScriptRoot 'compose.yml'
$envPath = Join-Path $PSScriptRoot '.env'

function New-RandomSecret {
    $bytes = [System.Security.Cryptography.RandomNumberGenerator]::GetBytes(48)
    return [Convert]::ToBase64String($bytes)
}

function ConvertTo-EnvQuotedValue([string]$Value) {
    $escaped = $Value.Replace('\', '\\').Replace('"', '\"')
    return '"' + $escaped + '"'
}

function Read-GoogleClientId {
    $clientId = $env:GOOGLE_CLIENT_ID
    if ([string]::IsNullOrWhiteSpace($clientId)) {
        $clientId = Read-Host 'Google Identity Services web client ID'
    }

    if ([string]::IsNullOrWhiteSpace($clientId)) {
        throw 'GOOGLE_CLIENT_ID is required for Google login.'
    }

    return $clientId.Trim()
}

function Test-EnvFileHasValue([string]$Path, [string]$Name) {
    $matchingLine = Get-Content -LiteralPath $Path |
        Where-Object { $_ -match ('^' + [regex]::Escape($Name) + '=') } |
        Select-Object -Last 1

    if ($null -eq $matchingLine) {
        return $false
    }

    $rawValue = ($matchingLine -split '=', 2)[1].Trim().Trim('"').Trim("'")
    return -not [string]::IsNullOrWhiteSpace($rawValue)
}

function Set-EnvFileValue([string]$Path, [string]$Name, [string]$Value) {
    $lines = [System.Collections.Generic.List[string]]::new()
    $lines.AddRange([string[]](Get-Content -LiteralPath $Path))
    $replacement = $Name + '=' + (ConvertTo-EnvQuotedValue $Value)
    $replaced = $false

    for ($index = 0; $index -lt $lines.Count; $index++) {
        if ($lines[$index] -match ('^' + [regex]::Escape($Name) + '=')) {
            $lines[$index] = $replacement
            $replaced = $true
        }
    }

    if (-not $replaced) {
        if ($lines.Count -gt 0 -and -not [string]::IsNullOrWhiteSpace($lines[$lines.Count - 1])) {
            $lines.Add('')
        }
        $lines.Add($replacement)
    }

    [System.IO.File]::WriteAllLines($Path, $lines, [System.Text.UTF8Encoding]::new($false))
}

if (-not (Test-Path -LiteralPath $envPath)) {
    $googleClientId = Read-GoogleClientId

    $resendApiKey = $env:RESEND_API_KEY
    if ([string]::IsNullOrWhiteSpace($resendApiKey)) {
        $resendApiKey = Read-Host 'Resend API key' -MaskInput
    }

    $resendFrom = $env:RESEND_FROM
    if ([string]::IsNullOrWhiteSpace($resendFrom)) {
        $resendFrom = Read-Host 'Verified Resend sender (for example: FluentA <noreply@example.com>)'
    }

    $azureSpeechRegion = $env:AZURE_SPEECH_REGION
    if ([string]::IsNullOrWhiteSpace($azureSpeechRegion)) {
        $azureSpeechRegion = Read-Host 'Azure Speech region (for example: eastasia)'
    }

    $azureSpeechSubscriptionKey = $env:AZURE_SPEECH_SUBSCRIPTION_KEY
    if ([string]::IsNullOrWhiteSpace($azureSpeechSubscriptionKey)) {
        $azureSpeechSubscriptionKey = Read-Host 'Azure Speech subscription key' -MaskInput
    }

    if (
        [string]::IsNullOrWhiteSpace($googleClientId) -or
        [string]::IsNullOrWhiteSpace($resendApiKey) -or
        [string]::IsNullOrWhiteSpace($resendFrom) -or
        [string]::IsNullOrWhiteSpace($azureSpeechRegion) -or
        [string]::IsNullOrWhiteSpace($azureSpeechSubscriptionKey)
    ) {
        throw 'GOOGLE_CLIENT_ID, RESEND_API_KEY, RESEND_FROM, AZURE_SPEECH_REGION, and AZURE_SPEECH_SUBSCRIPTION_KEY are required.'
    }

    $lines = @(
        'POSTGRES_DB=fluenta_docker_local'
        'POSTGRES_USER=fluenta_local'
        'POSTGRES_PASSWORD=' + (New-RandomSecret)
        'POSTGRES_PORT=55432'
        'MINIO_ROOT_USER=fluenta_minio_local'
        'MINIO_ROOT_PASSWORD=' + (New-RandomSecret)
        'MINIO_BUCKET=fluenta-assets-local'
        'MINIO_API_PORT=59000'
        'MINIO_CONSOLE_PORT=59001'
        'FLUENTA_HTTPS_PORT=7443'
        'JWT_KEY=' + (New-RandomSecret)
        'OTP_HASH_KEY=' + (New-RandomSecret)
        'GOOGLE_CLIENT_ID=' + (ConvertTo-EnvQuotedValue $googleClientId)
        'RESEND_API_KEY=' + (ConvertTo-EnvQuotedValue $resendApiKey)
        'RESEND_FROM=' + (ConvertTo-EnvQuotedValue $resendFrom)
        'AZURE_SPEECH_REGION=' + (ConvertTo-EnvQuotedValue $azureSpeechRegion)
        'AZURE_SPEECH_SUBSCRIPTION_KEY=' + (ConvertTo-EnvQuotedValue $azureSpeechSubscriptionKey)
    )

    [System.IO.File]::WriteAllLines($envPath, $lines, [System.Text.UTF8Encoding]::new($false))
    Write-Host "Created $envPath with generated local secrets."
}
elseif (-not (Test-EnvFileHasValue -Path $envPath -Name 'GOOGLE_CLIENT_ID')) {
    $googleClientId = Read-GoogleClientId
    Set-EnvFileValue -Path $envPath -Name 'GOOGLE_CLIENT_ID' -Value $googleClientId
    Write-Host "Added GOOGLE_CLIENT_ID to the existing $envPath file."
}

$composeArguments = @('compose', '--env-file', $envPath, '--file', $composePath, 'up', '--build')
if ($Detach) {
    $composeArguments += '--detach'
}

& docker @composeArguments
if ($LASTEXITCODE -ne 0) {
    throw "Docker Compose exited with code $LASTEXITCODE."
}
