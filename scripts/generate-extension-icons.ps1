param(
  [string]$OutputDir = "public/icons",
  [string]$BrandingDir = "assets/branding",
  [string]$FilePrefix = "firefox-tomato-icon",
  [int]$MasterSize = 1024
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

function New-RoundedRectanglePath {
  param(
    [float]$X,
    [float]$Y,
    [float]$Width,
    [float]$Height,
    [float]$Radius
  )

  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $diameter = $Radius * 2

  $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
  $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
  $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

function Add-LeafPath {
  param(
    [System.Drawing.Drawing2D.GraphicsPath]$Path,
    [System.Drawing.PointF[]]$Points
  )

  $Path.AddClosedCurve($Points, 0.45)
}

function New-TomatoBodyPath {
  param(
    [int]$Size
  )

  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $points = [System.Drawing.PointF[]]@(
    [System.Drawing.PointF]::new($Size * 0.50, $Size * 0.19),
    [System.Drawing.PointF]::new($Size * 0.71, $Size * 0.17),
    [System.Drawing.PointF]::new($Size * 0.87, $Size * 0.34),
    [System.Drawing.PointF]::new($Size * 0.91, $Size * 0.57),
    [System.Drawing.PointF]::new($Size * 0.82, $Size * 0.77),
    [System.Drawing.PointF]::new($Size * 0.63, $Size * 0.92),
    [System.Drawing.PointF]::new($Size * 0.50, $Size * 0.95),
    [System.Drawing.PointF]::new($Size * 0.37, $Size * 0.92),
    [System.Drawing.PointF]::new($Size * 0.18, $Size * 0.77),
    [System.Drawing.PointF]::new($Size * 0.09, $Size * 0.57),
    [System.Drawing.PointF]::new($Size * 0.13, $Size * 0.34),
    [System.Drawing.PointF]::new($Size * 0.29, $Size * 0.17)
  )
  $path.AddClosedCurve($points, 0.38)
  return $path
}

function New-TomatoMasterBitmap {
  param(
    [int]$Size
  )

  $bitmap = [System.Drawing.Bitmap]::new($Size, $Size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.Clear([System.Drawing.Color]::Transparent)

  try {
    $shadowPath = New-TomatoBodyPath -Size $Size
    $shadowMatrix = [System.Drawing.Drawing2D.Matrix]::new()
    $shadowMatrix.Translate(0, $Size * 0.02)
    $shadowPath.Transform($shadowMatrix)
    $shadowMatrix.Dispose()
    $outlineWidth = [Math]::Max(10, [Math]::Round($Size * 0.038))

    $shadowBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(56, 82, 14, 21))
    $graphics.FillPath($shadowBrush, $shadowPath)
    $shadowBrush.Dispose()
    $shadowPath.Dispose()

    $bodyPath = New-TomatoBodyPath -Size $Size

    $bodyBrush = [System.Drawing.Drawing2D.PathGradientBrush]::new($bodyPath)
    $bodyBrush.CenterPoint = [System.Drawing.PointF]::new($Size * 0.43, $Size * 0.39)
    $bodyBrush.CenterColor = [System.Drawing.Color]::FromArgb(255, 255, 92, 102)
    $bodyBrush.SurroundColors = @([System.Drawing.Color]::FromArgb(255, 211, 39, 63))
    $graphics.FillPath($bodyBrush, $bodyPath)
    $bodyBrush.Dispose()

    $outlinePen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 139, 20, 38), $outlineWidth)
    $outlinePen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $graphics.DrawPath($outlinePen, $bodyPath)
    $outlinePen.Dispose()
    $bodyPath.Dispose()

    $highlightBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(58, 255, 255, 255))
    $graphics.FillEllipse(
      $highlightBrush,
      [System.Drawing.RectangleF]::new($Size * 0.22, $Size * 0.34, $Size * 0.13, $Size * 0.24)
    )
    $highlightBrush.Dispose()

    $accentPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(88, 255, 255, 255), [Math]::Max(4, [Math]::Round($Size * 0.009)))
    $accentPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $accentPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $graphics.DrawArc(
      $accentPen,
      [System.Drawing.RectangleF]::new($Size * 0.61, $Size * 0.28, $Size * 0.14, $Size * 0.18),
      312,
      58
    )
    $accentPen.Dispose()

    $stemPath = New-RoundedRectanglePath -X ($Size * 0.47) -Y ($Size * 0.155) -Width ($Size * 0.06) -Height ($Size * 0.13) -Radius ($Size * 0.02)
    $stemBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 87, 117, 47))
    $graphics.FillPath($stemBrush, $stemPath)
    $stemBrush.Dispose()
    $stemPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 56, 78, 30), [Math]::Max(6, [Math]::Round($Size * 0.012)))
    $graphics.DrawPath($stemPen, $stemPath)
    $stemPen.Dispose()
    $stemPath.Dispose()

    $leafPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
    Add-LeafPath -Path $leafPath -Points @(
      [System.Drawing.PointF]::new($Size * 0.50, $Size * 0.17),
      [System.Drawing.PointF]::new($Size * 0.55, $Size * 0.04),
      [System.Drawing.PointF]::new($Size * 0.62, $Size * 0.17),
      [System.Drawing.PointF]::new($Size * 0.56, $Size * 0.27)
    )
    Add-LeafPath -Path $leafPath -Points @(
      [System.Drawing.PointF]::new($Size * 0.47, $Size * 0.18),
      [System.Drawing.PointF]::new($Size * 0.30, $Size * 0.10),
      [System.Drawing.PointF]::new($Size * 0.34, $Size * 0.24),
      [System.Drawing.PointF]::new($Size * 0.46, $Size * 0.28)
    )
    Add-LeafPath -Path $leafPath -Points @(
      [System.Drawing.PointF]::new($Size * 0.53, $Size * 0.18),
      [System.Drawing.PointF]::new($Size * 0.70, $Size * 0.10),
      [System.Drawing.PointF]::new($Size * 0.66, $Size * 0.24),
      [System.Drawing.PointF]::new($Size * 0.54, $Size * 0.28)
    )

    $leafBrush = [System.Drawing.Drawing2D.PathGradientBrush]::new($leafPath)
    $leafBrush.CenterPoint = [System.Drawing.PointF]::new($Size * 0.50, $Size * 0.22)
    $leafBrush.CenterColor = [System.Drawing.Color]::FromArgb(255, 142, 194, 79)
    $leafBrush.SurroundColors = @([System.Drawing.Color]::FromArgb(255, 64, 111, 43))
    $graphics.FillPath($leafBrush, $leafPath)
    $leafBrush.Dispose()

    $leafPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 46, 82, 33), [Math]::Max(7, [Math]::Round($Size * 0.012)))
    $leafPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $graphics.DrawPath($leafPen, $leafPath)
    $leafPen.Dispose()
    $leafPath.Dispose()

    return $bitmap
  }
  finally {
    $graphics.Dispose()
  }
}

function Get-ResizedBitmap {
  param(
    [System.Drawing.Bitmap]$SourceBitmap,
    [int]$Size
  )

  $bitmap = [System.Drawing.Bitmap]::new($Size, $Size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $graphics.DrawImage($SourceBitmap, 0, 0, $Size, $Size)
  $graphics.Dispose()
  return $bitmap
}

function Save-BitmapAsPng {
  param(
    [System.Drawing.Bitmap]$Bitmap,
    [string]$DestinationPath
  )

  $memoryStream = [System.IO.MemoryStream]::new()
  try {
    $Bitmap.Save($memoryStream, [System.Drawing.Imaging.ImageFormat]::Png)
    [System.IO.File]::WriteAllBytes($DestinationPath, $memoryStream.ToArray())
  }
  finally {
    $memoryStream.Dispose()
  }
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
New-Item -ItemType Directory -Force -Path $BrandingDir | Out-Null

$masterBitmap = New-TomatoMasterBitmap -Size $MasterSize

try {
  $masterPath = Join-Path $BrandingDir "logo-master-firefox.png"
  Save-BitmapAsPng -Bitmap $masterBitmap -DestinationPath $masterPath

  foreach ($size in 16, 32, 48, 128) {
    $path = Join-Path $OutputDir ("{0}-{1}.png" -f $FilePrefix, $size)
    $iconBitmap = Get-ResizedBitmap -SourceBitmap $masterBitmap -Size $size
    try {
      Save-BitmapAsPng -Bitmap $iconBitmap -DestinationPath $path
    }
    finally {
      $iconBitmap.Dispose()
    }
  }

  Write-Output "Generated tomato-first logo master and icon sizes."
}
finally {
  $masterBitmap.Dispose()
}
