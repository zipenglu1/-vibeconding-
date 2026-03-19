param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$rustCommandScript = Join-Path $PSScriptRoot "invoke-rust-command.ps1"
$rustValidationTargetDir = Join-Path $repoRoot "target\validation-msvc-check"
$rustValidationTargetMaxSizeGb = 6

function Get-DirectorySizeBytes {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path $Path)) {
        return 0L
    }

    $sum = 0L
    Get-ChildItem -Path $Path -Recurse -File -Force | ForEach-Object {
        $sum += $_.Length
    }
    return $sum
}

function Reset-RustValidationTargetIfNeeded {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,
        [Parameter(Mandatory = $true)]
        [int]$MaxSizeGb
    )

    $currentSizeBytes = Get-DirectorySizeBytes -Path $Path
    if ($currentSizeBytes -le 0) {
        return
    }

    $maxSizeBytes = [int64]$MaxSizeGb * 1GB
    if ($currentSizeBytes -lt $maxSizeBytes) {
        $currentSizeGb = [math]::Round($currentSizeBytes / 1GB, 2)
        Write-Host "Rust validation target cache size: $currentSizeGb GB" -ForegroundColor DarkGray
        return
    }

    $currentSizeGb = [math]::Round($currentSizeBytes / 1GB, 2)
    Write-Host ""
    Write-Host "==> Reset Rust validation target cache" -ForegroundColor Cyan
    Write-Host "Cleaning $Path because it reached $currentSizeGb GB (limit: $MaxSizeGb GB)." -ForegroundColor Yellow
    Remove-Item -Path $Path -Recurse -Force
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

function Invoke-RustStep {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Label,
        [Parameter(Mandatory = $true)]
        [string]$CargoCommandLine
    )

    $command = @(
        "powershell",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        $rustCommandScript,
        $CargoCommandLine,
        "-TargetDir",
        $rustValidationTargetDir,
        "-DisableIncremental",
        "-NoDebuginfo"
    )
    Invoke-Step -Label $Label -Command $command
}

foreach ($tool in @("pnpm", "cargo")) {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
        throw "Required tool not found: $tool"
    }
}

Push-Location $repoRoot
try {
    Reset-RustValidationTargetIfNeeded -Path $rustValidationTargetDir -MaxSizeGb $rustValidationTargetMaxSizeGb

    Invoke-Step -Label "Lint frontend workspace files" -Command @("pnpm", "lint:frontend")
    Invoke-Step -Label "Typecheck shared contracts" -Command @("pnpm", "--dir", "packages/ts-contracts", "typecheck")
    Invoke-Step -Label "Typecheck desktop frontend" -Command @("pnpm", "-C", "apps/desktop", "exec", "tsc", "--noEmit")
    Invoke-Step -Label "Lint Rust workspace with clippy" -Command @("pnpm", "lint:rust")
    Invoke-RustStep -Label "Check analytics-core crate" -CargoCommandLine "check -p analytics-core"
    Invoke-RustStep -Label "Check connectors crate" -CargoCommandLine "check -p connectors"
    Invoke-RustStep -Label "Check desktop crate" -CargoCommandLine "check -p desktop"
    Invoke-RustStep -Label "Check integration test targets" -CargoCommandLine "check -p integration-tests --tests"

    Write-Host ""
    Write-Host "Workspace validation completed." -ForegroundColor Green
}
finally {
    Pop-Location
}
