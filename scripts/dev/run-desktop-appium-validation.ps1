param(
    [string]$AppiumBaseUrl = "http://127.0.0.1:4725/wd/hub",
    [string]$DesktopExe = "",
    [string]$FixturePath = "",
    [string]$OutputDir = "",
    [switch]$IncludeDashboardViewFlow,
    [switch]$KeepDesktopOpen
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
if ([string]::IsNullOrWhiteSpace($DesktopExe)) {
    $DesktopExe = Join-Path $repoRoot "target\validation-msvc-package\release\desktop.exe"
}
if ([string]::IsNullOrWhiteSpace($FixturePath)) {
    $FixturePath = Join-Path $repoRoot "tests\fixtures\generated\sample-sales.csv"
}
if ([string]::IsNullOrWhiteSpace($OutputDir)) {
    $OutputDir = Join-Path $repoRoot "output\manual-test\appium-validation"
}

$appiumHome = Join-Path $repoRoot ".appium-home"
$npmCmd = "C:\Program Files\nodejs\npm.cmd"
$npxCmd = "C:\Program Files\nodejs\npx.cmd"
$appiumServerLog = Join-Path $OutputDir "appium-server.log"
$appiumStdErrLog = Join-Path $OutputDir "appium-server.err.log"

New-Item -ItemType Directory -Force $OutputDir | Out-Null
New-Item -ItemType Directory -Force $appiumHome | Out-Null

foreach ($requiredPath in @($DesktopExe, $FixturePath, $npmCmd, $npxCmd)) {
    if (-not (Test-Path $requiredPath)) {
        throw "Required path not found: $requiredPath"
    }
}

Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class DesktopWin32 {
  [StructLayout(LayoutKind.Sequential)]
  public struct RECT {
    public int Left;
    public int Top;
    public int Right;
    public int Bottom;
  }

  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint flags, uint dx, uint dy, uint data, UIntPtr extraInfo);
  [DllImport("user32.dll", SetLastError = true)] public static extern bool SetWindowPos(
    IntPtr hWnd,
    IntPtr hWndInsertAfter,
    int X,
    int Y,
    int cx,
    int cy,
    uint uFlags
  );
}
'@

$mouseLeftDown = [uint32]0x0002
$mouseLeftUp = [uint32]0x0004
$swShow = 5
$swpNoZOrder = [uint32]0x0004
$swpShowWindow = [uint32]0x0040

$coords = @{
    languageSelect = @{ x = 700; y = 160 }
    importPathInput = @{ x = 400; y = 255 }
    importLoadButton = @{ x = 250; y = 316 }
    surfaceStudioPage = @{ x = 245; y = 575 }
    runQueryButton = @{ x = 105; y = 245 }
    workspaceTab = @{ x = 105; y = 273 }
    dashboardTab = @{ x = 240; y = 273 }
    saveDashboardViewButton = @{ x = 392; y = 132 }
    savedDashboardViewChip = @{ x = 335; y = 186 }
}

function Write-Step {
    param([string]$Label)
    Write-Host ""
    Write-Host "==> $Label" -ForegroundColor Cyan
}

function Invoke-AppiumJson {
    param(
        [Parameter(Mandatory = $true)][string]$Method,
        [Parameter(Mandatory = $true)][string]$Path,
        [object]$Body = $null,
        [int]$TimeoutSec = 60
    )

    $uri = "{0}{1}" -f $AppiumBaseUrl.TrimEnd("/"), $Path
    if ($null -eq $Body) {
        return Invoke-RestMethod -Uri $uri -Method $Method -TimeoutSec $TimeoutSec
    }

    $json = $Body | ConvertTo-Json -Depth 12
    return Invoke-RestMethod -Uri $uri -Method $Method -ContentType "application/json" -Body $json -TimeoutSec $TimeoutSec
}

function Save-SessionScreenshot {
    param(
        [Parameter(Mandatory = $true)][string]$SessionId,
        [Parameter(Mandatory = $true)][string]$Name
    )

    $response = Invoke-AppiumJson -Method Get -Path "/session/$SessionId/screenshot"
    $filePath = Join-Path $OutputDir $Name
    [IO.File]::WriteAllBytes($filePath, [Convert]::FromBase64String($response.value))
    return $filePath
}

function Test-AppiumReady {
    try {
        $status = Invoke-AppiumJson -Method Get -Path "/status" -TimeoutSec 8
        return [bool]$status.value.ready
    }
    catch {
        return $false
    }
}

function Ensure-NovaWindowsDriver {
    $env:APPIUM_HOME = $appiumHome
    $driverList = cmd.exe /c "`"$npxCmd`" appium@3.2.2 driver list --installed 2>&1"
    if ($LASTEXITCODE -eq 0 -and $driverList -match "novawindows") {
        return
    }

    Write-Step "Install NovaWindows Appium driver"
    $installOutput = cmd.exe /c "`"$npxCmd`" appium@3.2.2 driver install --source=npm appium-novawindows-driver 2>&1"
    if ($LASTEXITCODE -ne 0 -and $installOutput -notmatch 'already installed') {
        throw "Failed to install appium-novawindows-driver: $installOutput"
    }
}

function Start-AppiumServerIfNeeded {
    $env:APPIUM_HOME = $appiumHome
    if (Test-AppiumReady) {
        return $null
    }

    Remove-Item $appiumServerLog, $appiumStdErrLog -Force -ErrorAction SilentlyContinue

    $server = Start-Process `
        -FilePath $npxCmd `
        -ArgumentList @(
            "appium@3.2.2",
            "server",
            "--address", "127.0.0.1",
            "--port", "4725",
            "--base-path", "/wd/hub",
            "--use-drivers", "novawindows",
            "--log", $appiumServerLog,
            "--log-level", "info"
        ) `
        -PassThru `
        -RedirectStandardOutput $appiumServerLog `
        -RedirectStandardError $appiumStdErrLog

    $ready = $false
    for ($attempt = 0; $attempt -lt 20; $attempt++) {
        Start-Sleep -Milliseconds 750
        if (Test-AppiumReady) {
            $ready = $true
            break
        }
    }

    if (-not $ready) {
        $stdout = if (Test-Path $appiumServerLog) { Get-Content $appiumServerLog -Tail 80 | Out-String } else { "" }
        $stderr = if (Test-Path $appiumStdErrLog) { Get-Content $appiumStdErrLog -Tail 80 | Out-String } else { "" }
        throw "Appium server did not become ready.`nSTDOUT:`n$stdout`nSTDERR:`n$stderr"
    }

    return $server
}

function Start-DesktopSession {
    $payload = @{
        capabilities = @{
            alwaysMatch = @{
                platformName = "Windows"
                "appium:automationName" = "NovaWindows"
                "appium:newCommandTimeout" = 3600
                "appium:shouldCloseApp" = $false
                "appium:app" = $DesktopExe
            }
            firstMatch = @(@{})
        }
    }

    $session = Invoke-AppiumJson -Method Post -Path "/session" -Body $payload -TimeoutSec 90
    return $session.value.sessionId
}

function Stop-DesktopSession {
    param([string]$SessionId)
    if ([string]::IsNullOrWhiteSpace($SessionId)) {
        return
    }

    try {
        Invoke-AppiumJson -Method Delete -Path "/session/$SessionId" -TimeoutSec 30 | Out-Null
    }
    catch {
    }
}

function Get-LatestDesktopProcess {
    $process = Get-Process -Name "desktop" -ErrorAction SilentlyContinue |
        Sort-Object StartTime -Descending |
        Select-Object -First 1
    if ($null -eq $process) {
        throw "desktop.exe process was not found."
    }
    return $process
}

function Set-DesktopWindowStable {
    param([System.Diagnostics.Process]$Process)

    [DesktopWin32]::ShowWindowAsync($Process.MainWindowHandle, $swShow) | Out-Null
    Start-Sleep -Milliseconds 200
    [DesktopWin32]::SetWindowPos(
        $Process.MainWindowHandle,
        [IntPtr]::Zero,
        20,
        20,
        816,
        639,
        $swpNoZOrder -bor $swpShowWindow
    ) | Out-Null
    Start-Sleep -Milliseconds 200
    [DesktopWin32]::SetForegroundWindow($Process.MainWindowHandle) | Out-Null
    Start-Sleep -Milliseconds 400
}

function Get-WindowRect {
    param([System.Diagnostics.Process]$Process)
    $rect = New-Object DesktopWin32+RECT
    [DesktopWin32]::GetWindowRect($Process.MainWindowHandle, [ref]$rect) | Out-Null
    return $rect
}

function Invoke-ClickRelative {
    param(
        [System.Diagnostics.Process]$Process,
        [int]$OffsetX,
        [int]$OffsetY,
        [int]$DelayMs = 900
    )

    Set-DesktopWindowStable -Process $Process
    $rect = Get-WindowRect -Process $Process
    [DesktopWin32]::SetCursorPos($rect.Left + $OffsetX, $rect.Top + $OffsetY) | Out-Null
    Start-Sleep -Milliseconds 100
    [DesktopWin32]::mouse_event($mouseLeftDown, 0, 0, 0, [UIntPtr]::Zero)
    Start-Sleep -Milliseconds 60
    [DesktopWin32]::mouse_event($mouseLeftUp, 0, 0, 0, [UIntPtr]::Zero)
    Start-Sleep -Milliseconds $DelayMs
}

function Invoke-NamedClick {
    param(
        [System.Diagnostics.Process]$Process,
        [string]$Name,
        [int]$DelayMs = 900
    )

    $target = $coords[$Name]
    if ($null -eq $target) {
        throw "Unknown click target: $Name"
    }

    Invoke-ClickRelative -Process $Process -OffsetX $target.x -OffsetY $target.y -DelayMs $DelayMs
}

function Send-Keys {
    param(
        [System.Diagnostics.Process]$Process,
        [string]$Keys,
        [int]$DelayMs = 700
    )

    Set-DesktopWindowStable -Process $Process
    [System.Windows.Forms.SendKeys]::SendWait($Keys)
    Start-Sleep -Milliseconds $DelayMs
}

function Invoke-Page {
    param(
        [System.Diagnostics.Process]$Process,
        [ValidateSet("Up", "Down")][string]$Direction,
        [int]$Count = 1
    )

    $key = if ($Direction -eq "Down") { "{PGDN}" } else { "{PGUP}" }
    for ($index = 0; $index -lt $Count; $index++) {
        Send-Keys -Process $Process -Keys $key -DelayMs 900
    }
}

function Set-ClipboardText {
    param([string]$Text)
    [System.Windows.Forms.Clipboard]::SetText($Text)
    Start-Sleep -Milliseconds 200
}

function Invoke-StepWithEvidence {
    param(
        [string]$Label,
        [string]$BeforeName,
        [scriptblock]$Action,
        [string]$AfterName,
        [string]$SessionId
    )

    Write-Step $Label
    Save-SessionScreenshot -SessionId $SessionId -Name $BeforeName | Out-Null
    & $Action
    Save-SessionScreenshot -SessionId $SessionId -Name $AfterName | Out-Null
}

function Reset-ToTopAnchor {
    param([System.Diagnostics.Process]$Process)
    Invoke-Page -Process $Process -Direction Up -Count 8
}

function Reset-ToQueryBuilderAnchor {
    param([System.Diagnostics.Process]$Process)
    Reset-ToTopAnchor -Process $Process
    Invoke-NamedClick -Process $Process -Name "surfaceStudioPage" -DelayMs 1400
    Invoke-Page -Process $Process -Direction Down -Count 1
}

function Reset-ToDashboardViewsAnchor {
    param([System.Diagnostics.Process]$Process)
    Reset-ToTopAnchor -Process $Process
    Invoke-Page -Process $Process -Direction Down -Count 1
}

function Reset-ToSaveDashboardViewAnchor {
    param([System.Diagnostics.Process]$Process)
    Reset-ToTopAnchor -Process $Process
    Invoke-NamedClick -Process $Process -Name "surfaceStudioPage" -DelayMs 1400
    Invoke-NamedClick -Process $Process -Name "workspaceTab" -DelayMs 1000
    Invoke-Page -Process $Process -Direction Down -Count 1
}

$serverProcess = $null
$sessionId = $null

try {
    Write-Step "Ensure Appium + NovaWindows are available"
    Ensure-NovaWindowsDriver
    $serverProcess = Start-AppiumServerIfNeeded

    Write-Step "Start desktop session"
    $sessionId = Start-DesktopSession
    Start-Sleep -Seconds 3
    $desktopProcess = Get-LatestDesktopProcess
    Set-DesktopWindowStable -Process $desktopProcess

    Invoke-StepWithEvidence -Label "Homepage in English" `
        -BeforeName "01-home-en.png" `
        -Action { } `
        -AfterName "01-home-en.png" `
        -SessionId $sessionId

    Invoke-StepWithEvidence -Label "Switch language to Chinese" `
        -BeforeName "02-language-open-before.png" `
        -Action {
            Invoke-NamedClick -Process $desktopProcess -Name "languageSelect" -DelayMs 1000
            Send-Keys -Process $desktopProcess -Keys "{DOWN}" -DelayMs 250
            Send-Keys -Process $desktopProcess -Keys "{ENTER}" -DelayMs 1800
        } `
        -AfterName "02-language-zh-after.png" `
        -SessionId $sessionId

    Write-Step "Open dataset import area"
    Invoke-Page -Process $desktopProcess -Direction Down -Count 2
    Save-SessionScreenshot -SessionId $sessionId -Name "03-import-area.png" | Out-Null

    Invoke-StepWithEvidence -Label "Import sample data with direct file path" `
        -BeforeName "04-import-before.png" `
        -Action {
            Invoke-NamedClick -Process $desktopProcess -Name "importPathInput" -DelayMs 250
            Set-ClipboardText -Text $FixturePath
            Send-Keys -Process $desktopProcess -Keys "^a" -DelayMs 150
            Send-Keys -Process $desktopProcess -Keys "^v" -DelayMs 300
            Invoke-NamedClick -Process $desktopProcess -Name "importLoadButton" -DelayMs 5000
        } `
        -AfterName "04-import-after.png" `
        -SessionId $sessionId

    Write-Step "Reach query builder"
    Reset-ToQueryBuilderAnchor -Process $desktopProcess
    Save-SessionScreenshot -SessionId $sessionId -Name "05-query-builder.png" | Out-Null

    Invoke-StepWithEvidence -Label "Run query" `
        -BeforeName "06-run-query-before.png" `
        -Action {
            Invoke-NamedClick -Process $desktopProcess -Name "runQueryButton" -DelayMs 7000
        } `
        -AfterName "06-run-query-after.png" `
        -SessionId $sessionId

    Write-Step "Return to dashboard header"
    Reset-ToTopAnchor -Process $desktopProcess
    Save-SessionScreenshot -SessionId $sessionId -Name "07-dashboard-header.png" | Out-Null

    Invoke-StepWithEvidence -Label "Toggle dashboard and workspace" `
        -BeforeName "08-dashboard-before-toggle.png" `
        -Action {
            Invoke-NamedClick -Process $desktopProcess -Name "workspaceTab" -DelayMs 1500
            Invoke-NamedClick -Process $desktopProcess -Name "dashboardTab" -DelayMs 1500
        } `
        -AfterName "08-dashboard-after-toggle.png" `
        -SessionId $sessionId

    if ($IncludeDashboardViewFlow) {
        Write-Step "Open save-dashboard-view section"
        Reset-ToSaveDashboardViewAnchor -Process $desktopProcess
        Save-SessionScreenshot -SessionId $sessionId -Name "09-save-dashboard-view-before.png" | Out-Null

        Invoke-StepWithEvidence -Label "Save dashboard view" `
            -BeforeName "10-save-dashboard-view-before-click.png" `
            -Action {
                Invoke-NamedClick -Process $desktopProcess -Name "saveDashboardViewButton" -DelayMs 2500
            } `
            -AfterName "10-save-dashboard-view-after-click.png" `
            -SessionId $sessionId

        Write-Step "Inspect dashboard views list"
        Reset-ToDashboardViewsAnchor -Process $desktopProcess
        Save-SessionScreenshot -SessionId $sessionId -Name "11-dashboard-views-list.png" | Out-Null

        Invoke-StepWithEvidence -Label "Open saved dashboard view" `
            -BeforeName "12-open-dashboard-view-before.png" `
            -Action {
                Invoke-NamedClick -Process $desktopProcess -Name "savedDashboardViewChip" -DelayMs 2500
            } `
            -AfterName "12-open-dashboard-view-after.png" `
            -SessionId $sessionId
    }

    Write-Host ""
    Write-Host "Desktop Appium validation completed." -ForegroundColor Green
    Write-Host "Artifacts: $OutputDir"
    if (-not $IncludeDashboardViewFlow) {
        Write-Host "Dashboard view save/open is skipped by default because deeper WebView interactions remain less stable." -ForegroundColor Yellow
    }
}
finally {
    if (-not $KeepDesktopOpen) {
        Stop-DesktopSession -SessionId $sessionId
        Get-Process -Name "desktop" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    }
}
