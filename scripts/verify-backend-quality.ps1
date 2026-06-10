param(
    [double]$MinimumLineCoverage = 75
)

$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$resultsDirectory = Join-Path $repoRoot 'TestResults/backend-quality'

Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $resultsDirectory
New-Item -ItemType Directory -Force $resultsDirectory | Out-Null

dotnet test (Join-Path $repoRoot 'src/backend/FluentA.slnx') `
    --no-restore `
    --collect:"XPlat Code Coverage" `
    --results-directory $resultsDirectory

function Normalize-CoveragePath([string]$assembly, [string]$filename) {
    $path = $filename -replace '/', '\'
    $prefix = "$assembly\"
    if ($path.StartsWith($prefix)) {
        return $path.Substring($prefix.Length)
    }

    return $path
}

$coverageByAssembly = @{}
$coverageFiles = Get-ChildItem $resultsDirectory -Recurse -Filter coverage.cobertura.xml
foreach ($file in $coverageFiles) {
    [xml]$xml = Get-Content $file.FullName
    foreach ($package in $xml.coverage.packages.package) {
        $assembly = [string]$package.name
        if ($assembly -notin @('FluentA.Domain', 'FluentA.Application')) {
            continue
        }

        if (-not $coverageByAssembly.ContainsKey($assembly)) {
            $coverageByAssembly[$assembly] = @{}
        }

        foreach ($class in $package.classes.class) {
            $className = [string]$class.name
            $filename = Normalize-CoveragePath $assembly ([string]$class.filename)
            if ($filename -like '*\DTOs\*' -or $className -like 'System.Text.RegularExpressions.Generated.*') {
                continue
            }

            foreach ($line in $class.lines.line) {
                $key = "$filename`:$($line.number)"
                if (-not $coverageByAssembly[$assembly].ContainsKey($key)) {
                    $coverageByAssembly[$assembly][$key] = 0
                }

                $coverageByAssembly[$assembly][$key] += [int]$line.hits
            }
        }
    }
}

$coverageFailures = @()
foreach ($assembly in @('FluentA.Domain', 'FluentA.Application')) {
    $lines = $coverageByAssembly[$assembly]
    $total = $lines.Count
    $covered = @($lines.GetEnumerator() | Where-Object { $_.Value -gt 0 }).Count
    $percent = if ($total -eq 0) { 0 } else { $covered / $total * 100 }
    Write-Host ("{0} logic line coverage: {1:N2}% ({2}/{3})" -f $assembly, $percent, $covered, $total)
    if ($percent -lt $MinimumLineCoverage) {
        $coverageFailures += ("{0} logic line coverage {1:N2}% is below {2:N2}%." -f $assembly, $percent, $MinimumLineCoverage)
    }
}

function Get-PreviousMeaningfulLine([string[]]$lines, [int]$index) {
    for ($cursor = $index - 1; $cursor -ge 0; $cursor -= 1) {
        $trimmed = $lines[$cursor].Trim()
        if ($trimmed.Length -eq 0 -or ($trimmed.StartsWith('[') -and $trimmed.EndsWith(']'))) {
            continue
        }

        return $trimmed
    }

    return ''
}

$docFailures = @()
$docTargets = @(
    @{ Path = 'src/backend/FluentA.API/Controllers'; Pattern = '^\s*public\s+async\s+Task<IActionResult>\s+\w+\(' },
    @{ Path = 'src/backend/FluentA.Application/BoundedContexts/Auth/IAuthService.cs'; Pattern = '^\s*Task<.*\w+\(' },
    @{ Path = 'src/backend/FluentA.Application/BoundedContexts/Flashcards/IFlashcardService.cs'; Pattern = '^\s*Task<.*\w+\(' },
    @{ Path = 'src/backend/FluentA.Application/BoundedContexts/Vocabulary/IVocabularyService.cs'; Pattern = '^\s*Task<.*\w+\(' }
)

foreach ($target in $docTargets) {
    $targetPath = Join-Path $repoRoot $target.Path
    $files = if (Test-Path $targetPath -PathType Container) {
        Get-ChildItem $targetPath -Filter *.cs
    } else {
        Get-Item $targetPath
    }

    foreach ($file in $files) {
        $lines = Get-Content $file.FullName
        for ($index = 0; $index -lt $lines.Count; $index += 1) {
            if ($lines[$index] -notmatch $target.Pattern) {
                continue
            }

            $previous = Get-PreviousMeaningfulLine $lines $index
            if (-not $previous.StartsWith('///')) {
                $relative = Resolve-Path -Relative $file.FullName
                $docFailures += "${relative}:$($index + 1) is missing an XML summary."
            }
        }
    }
}

if ($docFailures.Count -gt 0 -or $coverageFailures.Count -gt 0) {
    foreach ($failure in $coverageFailures + $docFailures) {
        Write-Error $failure
    }

    exit 1
}

Write-Host 'Backend quality gates passed.'
