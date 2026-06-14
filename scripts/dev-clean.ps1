$ErrorActionPreference = "Continue"

Write-Host "Checking port 3000..."

$lines = netstat -ano | findstr ":3000"
$pids = New-Object System.Collections.Generic.HashSet[int]

if ($LASTEXITCODE -eq 0 -and $lines) {
  foreach ($line in $lines) {
    if ($line -notmatch "LISTENING") {
      continue
    }

    $parts = ($line -replace "\s+", " ").Trim().Split(" ")
    $pidText = $parts[-1]

    if ($pidText -match "^\d+$") {
      [void]$pids.Add([int]$pidText)
    }
  }
}

if ($pids.Count -eq 0) {
  Write-Host "Port 3000 is free."
} else {
  foreach ($processId in $pids) {
    if ($processId -eq 0) {
      continue
    }
    Write-Host "Killing process on port 3000 (PID $processId)..."
    taskkill /PID $processId /F | Out-Null
  }
}

$projectRoot = Join-Path $PSScriptRoot ".."
Set-Location $projectRoot

$nextDir = Join-Path $projectRoot ".next"
if (Test-Path $nextDir) {
  Write-Host "Removing stale .next build cache..."
  Remove-Item -Recurse -Force $nextDir
}

Write-Host "Starting dev server on http://localhost:3000 ..."
npx --yes next dev -p 3000
