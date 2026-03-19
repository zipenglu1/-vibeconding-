param(
    [switch]$FrontendOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$previousRustupToolchain = $env:RUSTUP_TOOLCHAIN

if ($env:OS -eq "Windows_NT" -and -not $env:RUSTUP_TOOLCHAIN) {
    $env:RUSTUP_TOOLCHAIN = "stable-x86_64-pc-windows-msvc"
    Write-Host "RUSTUP_TOOLCHAIN=$env:RUSTUP_TOOLCHAIN" -ForegroundColor DarkGray
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

if (-not (Get-Command "pnpm" -ErrorAction SilentlyContinue)) {
    throw "Required tool not found: pnpm"
}

Push-Location $repoRoot
try {
    Invoke-Step -Label "Build desktop frontend assets" -Command @("pnpm", "--filter", "desktop", "build")

    if (-not $FrontendOnly) {
        Invoke-Step -Label "Build desktop Tauri bundle" -Command @("pnpm", "--filter", "desktop", "tauri", "build")
    }

    Write-Host ""
    if ($FrontendOnly) {
        Write-Host "Desktop frontend build completed." -ForegroundColor Green
    }
    else {
        Write-Host "Desktop packaging completed." -ForegroundColor Green
    }
}
finally {
    if ($null -ne $previousRustupToolchain) {
        $env:RUSTUP_TOOLCHAIN = $previousRustupToolchain
    }
    else {
        Remove-Item Env:RUSTUP_TOOLCHAIN -ErrorAction SilentlyContinue
    }
    Pop-Location
}
