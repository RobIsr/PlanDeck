[CmdletBinding()]
param(
  [switch]$SkipDependencies
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$skillSource = Join-Path $projectRoot 'skills\plandeck\SKILL.md'
$skillDestination = Join-Path $HOME '.copilot\skills\plandeck'
$legacySkillDestination = Join-Path $HOME '.copilot\skills\plan-studio'

if (!(Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'Node.js is required but was not found on PATH.'
}

if (!(Get-Command npm -ErrorAction SilentlyContinue)) {
  throw 'npm is required but was not found on PATH.'
}

if (!(Test-Path -LiteralPath $skillSource)) {
  throw "Bundled skill not found: $skillSource"
}

Push-Location $projectRoot
try {
  & npm unlink --global plan-studio --no-audit --no-fund 2>$null
  $npmPrefix = (& npm prefix --global).Trim()
  foreach ($legacyShim in @('plan-studio', 'plan-studio.cmd', 'plan-studio.ps1')) {
    $legacyShimPath = Join-Path $npmPrefix $legacyShim
    if (Test-Path -LiteralPath $legacyShimPath) {
      Remove-Item -LiteralPath $legacyShimPath -Force
    }
  }

  if (!$SkipDependencies) {
    & npm install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) {
      throw 'npm install failed.'
    }
  }

  & npm link
  if ($LASTEXITCODE -ne 0) {
    throw 'npm link failed.'
  }
} finally {
  Pop-Location
}

New-Item -ItemType Directory -Path $skillDestination -Force | Out-Null
Copy-Item -LiteralPath $skillSource -Destination (Join-Path $skillDestination 'SKILL.md') -Force
if (Test-Path -LiteralPath $legacySkillDestination) {
  Remove-Item -LiteralPath $legacySkillDestination -Recurse -Force
}

Write-Host ''
Write-Host 'PlanDeck installed successfully.'
Write-Host 'CLI:   plandeck'
Write-Host "Skill: $skillDestination"
