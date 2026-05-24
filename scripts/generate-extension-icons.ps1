param(
  [string]$SourcePath = "assets/branding/source-logo.png",
  [string]$OutputDir = "public/icons",
  [string]$BrandingDir = "assets/branding",
  [string]$FilePrefix = "firefox-icon"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

function Get-ColorDistanceSq([System.Drawing.Color]$left, [System.Drawing.Color]$right) {
  $dr = [int]$left.R - [int]$right.R
  $dg = [int]$left.G - [int]$right.G
  $db = [int]$left.B - [int]$right.B
  return ($dr * $dr) + ($dg * $dg) + ($db * $db)
}

function New-TransparentBitmapFromSource {
  param(
    [System.Drawing.Bitmap]$SourceBitmap
  )

  $width = $SourceBitmap.Width
  $height = $SourceBitmap.Height
  $cropped = New-Object System.Drawing.Bitmap $width, $height
  $graphics = [System.Drawing.Graphics]::FromImage($cropped)
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $graphics.DrawImage($SourceBitmap, 0, 0, $width, $height)
  $graphics.Dispose()

  $backgroundColor = $SourceBitmap.GetPixel(0, 0)
  $backgroundToleranceSq = 42 * 42 * 3
  $visited = New-Object 'bool[,]' $width, $height
  $queue = [System.Collections.Generic.Queue[System.Drawing.Point]]::new()

  $enqueue = {
    param([int]$x, [int]$y)
    if ($x -lt 0 -or $x -ge $width -or $y -lt 0 -or $y -ge $height) {
      return
    }

    if ($visited[$x, $y]) {
      return
    }

    $pixel = $cropped.GetPixel($x, $y)
    if ($pixel.A -eq 0) {
      $visited[$x, $y] = $true
      return
    }

    if ((Get-ColorDistanceSq $pixel $backgroundColor) -le $backgroundToleranceSq) {
      $visited[$x, $y] = $true
      $queue.Enqueue([System.Drawing.Point]::new($x, $y))
    }
  }

  for ($x = 0; $x -lt $width; $x++) {
    & $enqueue $x 0
    & $enqueue $x ($height - 1)
  }

  for ($y = 0; $y -lt $height; $y++) {
    & $enqueue 0 $y
    & $enqueue ($width - 1) $y
  }

  while ($queue.Count -gt 0) {
    $point = $queue.Dequeue()
    $cropped.SetPixel($point.X, $point.Y, [System.Drawing.Color]::Transparent)

    & $enqueue ($point.X - 1) $point.Y
    & $enqueue ($point.X + 1) $point.Y
    & $enqueue $point.X ($point.Y - 1)
    & $enqueue $point.X ($point.Y + 1)
  }

  return $cropped
}

function Get-AlphaBounds {
  param(
    [System.Drawing.Bitmap]$Bitmap
  )

  $minX = $Bitmap.Width
  $minY = $Bitmap.Height
  $maxX = -1
  $maxY = -1

  for ($y = 0; $y -lt $Bitmap.Height; $y++) {
    for ($x = 0; $x -lt $Bitmap.Width; $x++) {
      if ($Bitmap.GetPixel($x, $y).A -gt 0) {
        if ($x -lt $minX) { $minX = $x }
        if ($y -lt $minY) { $minY = $y }
        if ($x -gt $maxX) { $maxX = $x }
        if ($y -gt $maxY) { $maxY = $y }
      }
    }
  }

  if ($maxX -lt 0 -or $maxY -lt 0) {
    throw "Logo source became fully transparent after cleanup."
  }

  return [System.Drawing.Rectangle]::new($minX, $minY, ($maxX - $minX + 1), ($maxY - $minY + 1))
}

function Get-ScaledBitmap {
  param(
    [System.Drawing.Bitmap]$Bitmap,
    [int]$MaxDimension = 256
  )

  $scale = $MaxDimension / [double][Math]::Max($Bitmap.Width, $Bitmap.Height)
  if ($scale -ge 1.0) {
    return [pscustomobject]@{
      Bitmap = CropBitmap -Bitmap $Bitmap -Rectangle ([System.Drawing.Rectangle]::new(0, 0, $Bitmap.Width, $Bitmap.Height))
      Scale  = 1.0
    }
  }

  $width = [Math]::Max(1, [Math]::Round($Bitmap.Width * $scale))
  $height = [Math]::Max(1, [Math]::Round($Bitmap.Height * $scale))
  $scaled = New-Object System.Drawing.Bitmap $width, $height
  $graphics = [System.Drawing.Graphics]::FromImage($scaled)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $graphics.DrawImage($Bitmap, 0, 0, $width, $height)
  $graphics.Dispose()

  return [pscustomobject]@{
    Bitmap = $scaled
    Scale  = $scale
  }
}

function Get-DenseAlphaBounds {
  param(
    [System.Drawing.Bitmap]$Bitmap
  )

  $scaledResult = Get-ScaledBitmap -Bitmap $Bitmap -MaxDimension 256
  $preview = $scaledResult.Bitmap
  $scale = $scaledResult.Scale

  try {
    $visited = New-Object 'bool[,]' $preview.Width, $preview.Height
    $bestCount = 0
    $bestMinX = -1
    $bestMinY = -1
    $bestMaxX = -1
    $bestMaxY = -1

    for ($y = 0; $y -lt $preview.Height; $y++) {
      for ($x = 0; $x -lt $preview.Width; $x++) {
        if ($visited[$x, $y]) {
          continue
        }

        $visited[$x, $y] = $true
        if ($preview.GetPixel($x, $y).A -le 24) {
          continue
        }

        $queue = [System.Collections.Generic.Queue[System.Drawing.Point]]::new()
        $queue.Enqueue([System.Drawing.Point]::new($x, $y))
        $count = 0
        $minX = $x
        $maxX = $x
        $minY = $y
        $maxY = $y

        while ($queue.Count -gt 0) {
          $point = $queue.Dequeue()
          $count++

          if ($point.X -lt $minX) { $minX = $point.X }
          if ($point.X -gt $maxX) { $maxX = $point.X }
          if ($point.Y -lt $minY) { $minY = $point.Y }
          if ($point.Y -gt $maxY) { $maxY = $point.Y }

          foreach ($dx in -1, 0, 1) {
            foreach ($dy in -1, 0, 1) {
              if ($dx -eq 0 -and $dy -eq 0) {
                continue
              }

              $nx = $point.X + $dx
              $ny = $point.Y + $dy

              if ($nx -lt 0 -or $nx -ge $preview.Width -or $ny -lt 0 -or $ny -ge $preview.Height) {
                continue
              }

              if ($visited[$nx, $ny]) {
                continue
              }

              $visited[$nx, $ny] = $true
              if ($preview.GetPixel($nx, $ny).A -gt 24) {
                $queue.Enqueue([System.Drawing.Point]::new($nx, $ny))
              }
            }
          }
        }

        if ($count -gt $bestCount) {
          $bestCount = $count
          $bestMinX = $minX
          $bestMinY = $minY
          $bestMaxX = $maxX
          $bestMaxY = $maxY
        }
      }
    }

    if ($bestCount -le 0) {
      return Get-AlphaBounds -Bitmap $Bitmap
    }

    $inverseScale = 1.0 / $scale
    $scaledMinX = [Math]::Floor($bestMinX * $inverseScale)
    $scaledMinY = [Math]::Floor($bestMinY * $inverseScale)
    $scaledMaxX = [Math]::Ceiling(($bestMaxX + 1) * $inverseScale) - 1
    $scaledMaxY = [Math]::Ceiling(($bestMaxY + 1) * $inverseScale) - 1

    $padX = [Math]::Round(($scaledMaxX - $scaledMinX + 1) * 0.04)
    $padYTop = [Math]::Round(($scaledMaxY - $scaledMinY + 1) * 0.06)
    $padYBottom = [Math]::Round(($scaledMaxY - $scaledMinY + 1) * 0.03)

    $finalMinX = [Math]::Max(0, $scaledMinX - $padX)
    $finalMinY = [Math]::Max(0, $scaledMinY - $padYTop)
    $finalMaxX = [Math]::Min($Bitmap.Width - 1, $scaledMaxX + $padX)
    $finalMaxY = [Math]::Min($Bitmap.Height - 1, $scaledMaxY + $padYBottom)

    return [System.Drawing.Rectangle]::new(
      $finalMinX,
      $finalMinY,
      ($finalMaxX - $finalMinX + 1),
      ($finalMaxY - $finalMinY + 1)
    )
  }
  finally {
    $preview.Dispose()
  }
}

function CropBitmap {
  param(
    [System.Drawing.Bitmap]$Bitmap,
    [System.Drawing.Rectangle]$Rectangle
  )

  $target = New-Object System.Drawing.Bitmap $Rectangle.Width, $Rectangle.Height
  $graphics = [System.Drawing.Graphics]::FromImage($target)
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $graphics.DrawImage(
    $Bitmap,
    [System.Drawing.Rectangle]::new(0, 0, $Rectangle.Width, $Rectangle.Height),
    $Rectangle,
    [System.Drawing.GraphicsUnit]::Pixel
  )
  $graphics.Dispose()
  return $target
}

function RenderToSquareCanvas {
  param(
    [System.Drawing.Bitmap]$Bitmap,
    [int]$Size
  )

  $canvas = New-Object System.Drawing.Bitmap $Size, $Size
  $graphics = [System.Drawing.Graphics]::FromImage($canvas)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.Clear([System.Drawing.Color]::Transparent)

  $padding = [Math]::Round($Size * 0.10)
  $available = $Size - ($padding * 2)
  $sourceSize = [Math]::Max($Bitmap.Width, $Bitmap.Height)
  $scale = $available / [double]$sourceSize
  $drawWidth = [Math]::Round($Bitmap.Width * $scale)
  $drawHeight = [Math]::Round($Bitmap.Height * $scale)
  $drawX = [Math]::Round(($Size - $drawWidth) / 2.0)
  $drawY = [Math]::Round(($Size - $drawHeight) / 2.0)

  $graphics.DrawImage($Bitmap, $drawX, $drawY, $drawWidth, $drawHeight)
  $graphics.Dispose()

  return $canvas
}

if (-not (Test-Path -LiteralPath $SourcePath)) {
  throw "Source logo file not found: $SourcePath"
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
New-Item -ItemType Directory -Force -Path $BrandingDir | Out-Null

$sourceBitmap = [System.Drawing.Bitmap]::FromFile((Resolve-Path $SourcePath))

try {
  $sourceCropRect = [System.Drawing.Rectangle]::new(
    [Math]::Round($sourceBitmap.Width * 0.14),
    [Math]::Round($sourceBitmap.Height * 0.05),
    [Math]::Round($sourceBitmap.Width * 0.72),
    [Math]::Round($sourceBitmap.Height * 0.82)
  )

  $croppedSource = CropBitmap -Bitmap $sourceBitmap -Rectangle $sourceCropRect
  $transparentBitmap = New-TransparentBitmapFromSource -SourceBitmap $croppedSource
  $alphaBounds = Get-DenseAlphaBounds -Bitmap $transparentBitmap
  $logoOnly = CropBitmap -Bitmap $transparentBitmap -Rectangle $alphaBounds

  $masterPath = Join-Path $BrandingDir "logo-master.png"
  $masterBitmap = RenderToSquareCanvas -Bitmap $logoOnly -Size 1024
  $masterBitmap.Save($masterPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $masterBitmap.Dispose()

  foreach ($size in 16, 32, 48, 128) {
    $path = Join-Path $OutputDir ("{0}-{1}.png" -f $FilePrefix, $size)
    $iconBitmap = RenderToSquareCanvas -Bitmap $logoOnly -Size $size
    $iconBitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $iconBitmap.Dispose()
  }

  Write-Output "Generated logo master and icon sizes from $SourcePath."
}
finally {
  if ($null -ne $logoOnly) { $logoOnly.Dispose() }
  if ($null -ne $transparentBitmap) { $transparentBitmap.Dispose() }
  if ($null -ne $croppedSource) { $croppedSource.Dispose() }
  $sourceBitmap.Dispose()
}
