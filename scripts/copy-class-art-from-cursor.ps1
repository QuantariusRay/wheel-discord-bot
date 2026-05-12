# Copies Cursor-dumped class PNGs from assets/ into assets/classes/ with stable names.
# Run from repo root: pwsh -File scripts/copy-class-art-from-cursor.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$assets = Join-Path $root "assets"
$dest = Join-Path $assets "classes"
New-Item -ItemType Directory -Force -Path $dest | Out-Null

function Copy-FirstMatch {
  param([string]$Pattern, [string]$OutName)
  $hit = Get-ChildItem -Path $assets -Filter $Pattern -File -ErrorAction SilentlyContinue |
    Sort-Object Name |
    Select-Object -First 1
  if ($hit) {
    Copy-Item -LiteralPath $hit.FullName -Destination (Join-Path $dest $OutName) -Force
    Write-Host "OK $OutName <= $($hit.Name)"
  } else {
    Write-Warning "No match for pattern: $Pattern"
  }
}

Copy-FirstMatch "*ironclad*.png" "ironclad.png"
Copy-FirstMatch "*silent*.png" "silent.png"
Copy-FirstMatch "*regent*.png" "regent.png"
Copy-FirstMatch "*necrobinder*.png" "necrobinder.png"
Copy-FirstMatch "*defect*.png" "defect.png"

Write-Host "Done. Files in: $dest"
