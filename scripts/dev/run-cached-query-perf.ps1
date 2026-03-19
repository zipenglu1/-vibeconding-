param(
    [int]$RowCount = 1000000,
    [int]$CacheThresholdMs = 120000,
    [int]$QueryThresholdMs = 15000
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")

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

Push-Location $repoRoot
try {
    $env:OFFLINE_BI_PERF_ROW_COUNT = [string]$RowCount
    $env:OFFLINE_BI_PERF_CACHE_THRESHOLD_MS = [string]$CacheThresholdMs
    $env:OFFLINE_BI_PERF_QUERY_THRESHOLD_MS = [string]$QueryThresholdMs

    Invoke-Step -Label "Run cached query performance regression guard" -Command @(
        "cargo",
        "+stable-x86_64-pc-windows-msvc",
        "test",
        "-p",
        "integration-tests",
        "cached_query_perf_regression_guard",
        "--release",
        "--",
        "--ignored",
        "--exact",
        "--nocapture"
    )
}
finally {
    $env:OFFLINE_BI_PERF_ROW_COUNT = $null
    $env:OFFLINE_BI_PERF_CACHE_THRESHOLD_MS = $null
    $env:OFFLINE_BI_PERF_QUERY_THRESHOLD_MS = $null
    Pop-Location
}
