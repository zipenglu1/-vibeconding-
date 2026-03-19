param(
    [int]$TimeoutMs = 60000,
    [int]$Workers = 1,
    [switch]$KeepArtifacts
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$desktopRoot = Join-Path $repoRoot "apps\desktop"
$artifactPaths = @(
    (Join-Path $desktopRoot "test-results"),
    (Join-Path $desktopRoot "playwright-report")
)

function Remove-PlaywrightArtifacts {
    foreach ($artifactPath in $artifactPaths) {
        if (Test-Path $artifactPath) {
            Remove-Item -Path $artifactPath -Recurse -Force
        }
    }
}

function Invoke-Step {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Label,
        [Parameter(Mandatory = $true)]
        [string[]]$Command
    )

    Write-Host ""
    Write-Host "==> $Label" -ForegroundColor Cyan

    $arguments = @()
    if ($Command.Length -gt 1) {
        $arguments = $Command[1..($Command.Length - 1)]
    }

    & $Command[0] @arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Step failed: $Label"
    }
}

foreach ($tool in @("pnpm")) {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
        throw "Required tool not found: $tool"
    }
}

Push-Location $desktopRoot
try {
    Remove-PlaywrightArtifacts

    Invoke-Step -Label "Typecheck desktop frontend" -Command @(
        "pnpm",
        "exec",
        "tsc",
        "--noEmit"
    )

    Invoke-Step -Label "Run desktop browser E2E" -Command @(
        "pnpm",
        "exec",
        "playwright",
        "test",
        "--timeout",
        $TimeoutMs.ToString(),
        "--workers",
        $Workers.ToString()
    )

    Write-Host ""
    Write-Host "Desktop browser validation completed." -ForegroundColor Green
}
finally {
    if (-not $KeepArtifacts) {
        Remove-PlaywrightArtifacts
    }
    Pop-Location
}
