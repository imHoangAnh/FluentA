$ErrorActionPreference = 'Stop'

$frontendDirectory = Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..\..\src\frontend')
Push-Location $frontendDirectory

try {
    & npm.cmd run test:run -- src/test/dashboard/DashboardPage.test.tsx
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
finally {
    Pop-Location
}
