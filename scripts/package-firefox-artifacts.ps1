Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$distDir = Join-Path $repoRoot 'dist-firefox'
$artifactsDir = Join-Path $repoRoot 'artifacts'
$packageJson = Get-Content -LiteralPath (Join-Path $repoRoot 'package.json') -Raw | ConvertFrom-Json
$version = $packageJson.version
$xpiPath = Join-Path $artifactsDir "pomodoro-cult-firefox-$version.xpi"
$sourceZipPath = Join-Path $artifactsDir "pomodoro-cult-firefox-source-$version.zip"

if (!(Test-Path $distDir)) {
  throw "dist-firefox not found. Run 'npm.cmd run build:firefox' first."
}

if (!(Test-Path $artifactsDir)) {
  New-Item -ItemType Directory -Path $artifactsDir | Out-Null
}

if (Test-Path $xpiPath) {
  Remove-Item -LiteralPath $xpiPath -Force
}

if (Test-Path $sourceZipPath) {
  Remove-Item -LiteralPath $sourceZipPath -Force
}

$xpiArchive = [System.IO.Compression.ZipFile]::Open($xpiPath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($file in Get-ChildItem -Path $distDir -Recurse -File) {
    $entryName = $file.FullName.Substring($distDir.Length + 1).Replace('\', '/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
      $xpiArchive,
      $file.FullName,
      $entryName,
      [System.IO.Compression.CompressionLevel]::Optimal
    ) | Out-Null
  }
} finally {
  $xpiArchive.Dispose()
}

$excludedNames = @('.git', 'node_modules', 'dist', 'dist-firefox', 'artifacts')
$sourceArchive = [System.IO.Compression.ZipFile]::Open($sourceZipPath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($file in Get-ChildItem -Path $repoRoot -Recurse -File | Where-Object {
    $relative = $_.FullName.Substring($repoRoot.Length + 1)
    $firstSegment = ($relative -split '[\\/]', 2)[0]
    $excludedNames -notcontains $firstSegment
  }) {
    $entryName = $file.FullName.Substring($repoRoot.Length + 1).Replace('\', '/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
      $sourceArchive,
      $file.FullName,
      $entryName,
      [System.IO.Compression.CompressionLevel]::Optimal
    ) | Out-Null
  }
} finally {
  $sourceArchive.Dispose()
}

Write-Host "Created:"
Write-Host " - $xpiPath"
Write-Host " - $sourceZipPath"
