param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$CommandLine,
    [string]$TargetDir,
    [switch]$DisableIncremental,
    [switch]$NoDebuginfo,
    [int]$MinimumFreeSpaceGb = 2,
    [int]$MinimumResetTargetSizeGb = 4
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not (Get-Command "cargo" -ErrorAction SilentlyContinue)) {
    throw "Required tool not found: cargo"
}

function Test-IsValidationTargetDir {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    $leaf = Split-Path -Path $Path -Leaf
    return $leaf -like "validation-*"
}

function Get-DriveFreeBytes {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    $root = [System.IO.Path]::GetPathRoot($Path)
    if (-not $root) {
        return $null
    }

    $drive = Get-PSDrive -Name $root.TrimEnd('\', ':') -ErrorAction SilentlyContinue
    if ($null -eq $drive) {
        return $null
    }

    return [int64]$drive.Free
}

function Get-DirectorySizeBytes {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path $Path)) {
        return 0L
    }

    $sum = 0L
    Get-ChildItem -Path $Path -Recurse -File -Force -ErrorAction SilentlyContinue | ForEach-Object {
        $sum += $_.Length
    }
    return $sum
}

function Reset-TargetDirForLowDiskSpace {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,
        [Parameter(Mandatory = $true)]
        [int]$MinFreeSpaceGb,
        [Parameter(Mandatory = $true)]
        [int]$MinResetTargetSizeGb,
        [switch]$Force
    )

    if (-not (Test-IsValidationTargetDir -Path $Path)) {
        return $false
    }

    if (-not (Test-Path $Path)) {
        return $false
    }

    $freeBytes = Get-DriveFreeBytes -Path $Path
    $minimumFreeBytes = [int64]$MinFreeSpaceGb * 1GB
    if (-not $Force -and $null -ne $freeBytes -and $freeBytes -ge $minimumFreeBytes) {
        return $false
    }

    $targetSizeBytes = Get-DirectorySizeBytes -Path $Path
    $minimumResetTargetSizeBytes = [int64]$MinResetTargetSizeGb * 1GB
    if (-not $Force -and $targetSizeBytes -lt $minimumResetTargetSizeBytes) {
        return $false
    }

    $reason = if ($Force) {
        "the previous cargo invocation failed under low-disk conditions"
    } else {
        $targetSizeGb = [math]::Round($targetSizeBytes / 1GB, 2)
        "free disk space dropped below ${MinFreeSpaceGb} GB and the validation cache had grown to ${targetSizeGb} GB"
    }

    Write-Host "Resetting validation target cache at $Path because $reason." -ForegroundColor Yellow
    Remove-Item -Path $Path -Recurse -Force
    return $true
}

$toolchain = $env:OFFLINE_BI_RUST_TOOLCHAIN
if (-not $toolchain -and $env:OS -eq "Windows_NT") {
    $toolchain = "stable-x86_64-pc-windows-msvc"
}

$command = @()
if ($toolchain) {
    $command += "+$toolchain"
}
if ($CommandLine.Trim().Length -gt 0) {
    $command += ($CommandLine -split "\s+" | Where-Object { $_.Length -gt 0 })
}

if ($TargetDir) {
    $resolvedTargetDir = [System.IO.Path]::GetFullPath($TargetDir)
    $env:CARGO_TARGET_DIR = $resolvedTargetDir
    Write-Host "CARGO_TARGET_DIR=$resolvedTargetDir" -ForegroundColor DarkGray
    [void](Reset-TargetDirForLowDiskSpace -Path $resolvedTargetDir -MinFreeSpaceGb $MinimumFreeSpaceGb -MinResetTargetSizeGb $MinimumResetTargetSizeGb)
}

if ($DisableIncremental) {
    $env:CARGO_INCREMENTAL = "0"
    Write-Host "CARGO_INCREMENTAL=0" -ForegroundColor DarkGray
}

if ($NoDebuginfo) {
    $rustFlags = @()
    if ($env:RUSTFLAGS) {
        $rustFlags += $env:RUSTFLAGS.Trim()
    }
    $rustFlags += "-C debuginfo=0"
    $env:RUSTFLAGS = ($rustFlags -join " ").Trim()
    Write-Host "RUSTFLAGS=$env:RUSTFLAGS" -ForegroundColor DarkGray
}

Write-Host ("cargo {0}" -f ($command -join " ")) -ForegroundColor DarkGray
& cargo @command
$exitCode = $LASTEXITCODE

if (
    $exitCode -ne 0 -and
    $TargetDir -and
    (Reset-TargetDirForLowDiskSpace -Path $resolvedTargetDir -MinFreeSpaceGb $MinimumFreeSpaceGb -MinResetTargetSizeGb $MinimumResetTargetSizeGb -Force)
) {
    Write-Host "Retrying cargo command after clearing the validation target cache." -ForegroundColor Yellow
    & cargo @command
    $exitCode = $LASTEXITCODE
}

exit $exitCode
