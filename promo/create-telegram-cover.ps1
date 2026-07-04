Add-Type -AssemblyName System.Drawing

$size = 1080
$outputPath = Join-Path $PSScriptRoot 'pomodoro-cult-telegram-cover.png'
$iconPath = Join-Path (Split-Path $PSScriptRoot -Parent) 'public\icons\firefox-tomato-icon-128.png'

$bitmap = New-Object System.Drawing.Bitmap($size, $size)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

function New-RoundedPath {
  param(
    [float]$X,
    [float]$Y,
    [float]$Width,
    [float]$Height,
    [float]$Radius
  )

  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $diameter = $Radius * 2
  $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
  $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
  $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

try {
  $utf8 = [System.Text.Encoding]::UTF8
  $eyebrowText = $utf8.GetString([Convert]::FromBase64String('0JzQldCi0J7QlCDQn9Ce0JzQntCU0J7QoNCe'))
  $titleText = $utf8.GetString([Convert]::FromBase64String('0KHRhNC+0LrRg9GB0LjRgNGD0LnRgtC10YHRjCDQvdCwINC+0LTQvdC+0Lkg0LfQsNC00LDRh9C1'))
  $subtitleText = $utf8.GetString([Convert]::FromBase64String('0KDQsNCx0L7RgtCwINC60L7RgNC+0YLQutC40LzQuCDRhtC40LrQu9Cw0LzQuCDQv9C+0LzQvtCz0LDQtdGCINC90LDRh9Cw0YLRjCDQuCDQstC+0LLRgNC10LzRjyDQvtGC0LTRi9GF0LDRgtGM'))
  $footerText = $utf8.GetString([Convert]::FromBase64String('UG9tb2Rvcm8gQ3VsdCAg4oCiICDRgNCw0YHRiNC40YDQtdC90LjQtSDQtNC70Y8gTW96aWxsYSBGaXJlZm94'))

  $background = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point(0, 0)),
    (New-Object System.Drawing.Point($size, $size)),
    [System.Drawing.Color]::FromArgb(255, 10, 12, 17),
    [System.Drawing.Color]::FromArgb(255, 23, 27, 35)
  )
  $graphics.FillRectangle($background, 0, 0, $size, $size)

  $accentGlow = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(24, 250, 56, 91))
  $graphics.FillEllipse($accentGlow, 90, 175, 900, 900)

  $panelPath = New-RoundedPath -X 80 -Y 80 -Width 920 -Height 920 -Radius 52
  $panelBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(230, 14, 17, 23))
  $graphics.FillPath($panelBrush, $panelPath)

  $panelPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 42, 47, 58), 2)
  $graphics.DrawPath($panelPen, $panelPath)

  $eyebrowFont = New-Object System.Drawing.Font('Segoe UI', 24, [System.Drawing.FontStyle]::Bold)
  $titleFont = New-Object System.Drawing.Font('Segoe UI', 44, [System.Drawing.FontStyle]::Bold)
  $subtitleFont = New-Object System.Drawing.Font('Segoe UI', 23, [System.Drawing.FontStyle]::Regular)
  $timerFont = New-Object System.Drawing.Font('Consolas', 58, [System.Drawing.FontStyle]::Bold)
  $footerFont = New-Object System.Drawing.Font('Segoe UI', 22, [System.Drawing.FontStyle]::Regular)

  $mutedBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 174, 182, 199))
  $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 248, 249, 251))
  $accentBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 250, 56, 91))

  $centerFormat = New-Object System.Drawing.StringFormat
  $centerFormat.Alignment = [System.Drawing.StringAlignment]::Center
  $centerFormat.LineAlignment = [System.Drawing.StringAlignment]::Center

  $graphics.DrawString(
    $eyebrowText,
    $eyebrowFont,
    $accentBrush,
    (New-Object System.Drawing.RectangleF(100, 120, 880, 44)),
    $centerFormat
  )
  $graphics.DrawString(
    $titleText,
    $titleFont,
    $whiteBrush,
    (New-Object System.Drawing.RectangleF(130, 170, 820, 116)),
    $centerFormat
  )
  $graphics.DrawString(
    $subtitleText,
    $subtitleFont,
    $mutedBrush,
    (New-Object System.Drawing.RectangleF(150, 292, 780, 72)),
    $centerFormat
  )

  $ringPenBack = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 42, 47, 58), 28)
  $ringPenBack.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $ringPenBack.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $ringPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 250, 56, 91), 28)
  $ringPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $ringPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

  $ringRect = New-Object System.Drawing.Rectangle(275, 390, 530, 530)
  $graphics.DrawArc($ringPenBack, $ringRect, -90, 360)
  $graphics.DrawArc($ringPen, $ringRect, -90, 292)

  $icon = [System.Drawing.Image]::FromFile($iconPath)
  $graphics.DrawImage($icon, 385, 475, 310, 310)

  $timerPanelPath = New-RoundedPath -X 365 -Y 790 -Width 350 -Height 92 -Radius 30
  $timerPanelBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(245, 27, 31, 40))
  $graphics.FillPath($timerPanelBrush, $timerPanelPath)
  $graphics.DrawString(
    '25:00',
    $timerFont,
    $whiteBrush,
    (New-Object System.Drawing.RectangleF(365, 790, 350, 92)),
    $centerFormat
  )

  $graphics.DrawString(
    $footerText,
    $footerFont,
    $mutedBrush,
    (New-Object System.Drawing.RectangleF(120, 930, 840, 40)),
    $centerFormat
  )

  $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
}
finally {
  if ($icon) { $icon.Dispose() }
  $graphics.Dispose()
  $bitmap.Dispose()
}

Write-Host $outputPath
