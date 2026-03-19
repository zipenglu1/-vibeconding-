param(
    [string]$OutputPath = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    $OutputPath = Join-Path $repoRoot "tests\fixtures\generated\sample-sales.csv"
}

$targetPath = [System.IO.Path]::GetFullPath($OutputPath)
$targetDirectory = Split-Path -Parent $targetPath
New-Item -ItemType Directory -Force -Path $targetDirectory | Out-Null

$regions = @("North", "South", "East", "West")
$categories = @("Hardware", "Software", "Services")
$products = @("Starter", "Team", "Enterprise", "Support")

$rows = for ($index = 0; $index -lt 24; $index++) {
    $region = $regions[$index % $regions.Count]
    $category = $categories[$index % $categories.Count]
    $product = $products[$index % $products.Count]

    [PSCustomObject]@{
        order_id = "ORD-{0:D4}" -f ($index + 1)
        order_date = (Get-Date "2026-01-01").AddDays($index).ToString("yyyy-MM-dd")
        region = $region
        category = $category
        product = $product
        revenue = 1200 + ($index * 135)
        units = 3 + ($index % 7)
        discount_rate = [math]::Round((($index % 5) * 0.025), 3)
    }
}

$rows | Export-Csv -Path $targetPath -NoTypeInformation -Encoding utf8

Write-Host "Created sample CSV at $targetPath" -ForegroundColor Green
Write-Host "Rows: $($rows.Count)"
