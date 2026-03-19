param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$rustCommandScript = Join-Path $PSScriptRoot "invoke-rust-command.ps1"
$rustValidationTargetDir = Join-Path $repoRoot "target\validation-msvc-check"

function Invoke-Step {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Label,
        [Parameter(Mandatory = $true)]
        [string]$CargoCommandLine
    )

    Write-Host ""
    Write-Host "==> $Label" -ForegroundColor Cyan

    & powershell `
        -ExecutionPolicy Bypass `
        -File $rustCommandScript `
        $CargoCommandLine `
        -TargetDir $rustValidationTargetDir `
        -DisableIncremental `
        -NoDebuginfo

    if ($LASTEXITCODE -ne 0) {
        throw "Step failed: $Label"
    }
}

Push-Location $repoRoot
try {
    Invoke-Step -Label "Test telemetry crate" -CargoCommandLine "test -p telemetry"
    Invoke-Step -Label "Test job-runner crate" -CargoCommandLine "test -p job-runner"
    Invoke-Step -Label "Test desktop support layer without Tauri runtime features" -CargoCommandLine "test -p desktop --lib --no-default-features"

    Write-Host ""
    Write-Host "Desktop light validation completed." -ForegroundColor Green
}
finally {
    Pop-Location
}
