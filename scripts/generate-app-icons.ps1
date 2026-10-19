# scripts/generate-app-icons.ps1
Add-Type -AssemblyName System.Drawing

$sourcePath = 'C:\Users\Usuario\.gemini\antigravity-ide\brain\b892ac97-873f-40ae-8c03-4827791a6419\.user_uploaded\media_1792370780663.jpg'
$outputDir = 'd:\ANTIGRAVITY\GarroterosApp\frontend'

$src = [System.Drawing.Bitmap]::FromFile($sourcePath)

# Función para generar bitmap escalado con máxima calidad bicúbica
function New-ResizedBitmap {
    param (
        [System.Drawing.Image]$Image,
        [int]$Width,
        [int]$Height,
        [System.Drawing.Rectangle]$SrcRect,
        [System.Drawing.Color]$Background = [System.Drawing.Color]::Transparent
    )

    $target = New-Object System.Drawing.Bitmap($Width, $Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($target)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    if ($Background -ne [System.Drawing.Color]::Transparent) {
        $brush = New-Object System.Drawing.SolidBrush($Background)
        $g.FillRectangle($brush, 0, 0, $Width, $Height)
        $brush.Dispose()
    }

    $destRect = New-Object System.Drawing.Rectangle(0, 0, $Width, $Height)
    $g.DrawImage($Image, $destRect, $SrcRect, [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()

    return $target
}

# 1. Crear Master Square 1024x1024 con fondo de pergamino
$masterSize = 1024
$masterBmp = New-Object System.Drawing.Bitmap($masterSize, $masterSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gMaster = [System.Drawing.Graphics]::FromImage($masterBmp)
$gMaster.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gMaster.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$gMaster.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

# Fondo color pergamino muestreado del borde
$bgParchment = [System.Drawing.Color]::FromArgb(255, 241, 218, 174)
$bgBrush = New-Object System.Drawing.SolidBrush($bgParchment)
$gMaster.FillRectangle($bgBrush, 0, 0, $masterSize, $masterSize)
$bgBrush.Dispose()

# Para un blending perfecto del fondo de pergamino, dibujar la imagen completa estirada suavemente de fondo
$destFull = New-Object System.Drawing.Rectangle(0, 0, $masterSize, $masterSize)
$srcFull = New-Object System.Drawing.Rectangle(0, 0, $src.Width, $src.Height)
$gMaster.DrawImage($src, $destFull, $srcFull, [System.Drawing.GraphicsUnit]::Pixel)

# Ahora dibujar el logo nítido en el centro manteniendo su relación de aspecto original
$destLogo = New-Object System.Drawing.Rectangle(0, [int](($masterSize - $src.Height)/2), $masterSize, $src.Height)
$gMaster.DrawImage($src, $destLogo, $srcFull, [System.Drawing.GraphicsUnit]::Pixel)
$gMaster.Dispose()

Write-Output "Master 1024x1024 generated successfully."

# Guardar Master Web Logo
$webLogoDir = "$outputDir\src\assets\logo"
if (-not (Test-Path $webLogoDir)) { New-Item -ItemType Directory -Path $webLogoDir -Force | Out-Null }

$masterBmp.Save("$webLogoDir\garroteros-logo.png", [System.Drawing.Imaging.ImageFormat]::Png)
$masterBmp.Save("$webLogoDir\garroteros-logo.jpg", [System.Drawing.Imaging.ImageFormat]::Jpeg)
Write-Output "Saved web logos to $webLogoDir"

# Guardar Favicon 64x64
$iconDir = "$outputDir\src\assets\icon"
$favicon = New-ResizedBitmap -Image $masterBmp -Width 64 -Height 64 -SrcRect (New-Object System.Drawing.Rectangle(0, 0, $masterSize, $masterSize))
$favicon.Save("$iconDir\favicon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$favicon.Dispose()
Write-Output "Saved favicon to $iconDir\favicon.png"

# 2. Splash Screens para Android (1024x1024)
$resDir = "$outputDir\android\app\src\main\res"

$splashDirs = @(
    "drawable",
    "drawable-port-mdpi",
    "drawable-port-hdpi",
    "drawable-port-xhdpi",
    "drawable-port-xxhdpi",
    "drawable-port-xxxhdpi",
    "drawable-land-mdpi",
    "drawable-land-hdpi",
    "drawable-land-xhdpi",
    "drawable-land-xxhdpi",
    "drawable-land-xxxhdpi"
)

foreach ($d in $splashDirs) {
    $dirPath = "$resDir\$d"
    if (Test-Path $dirPath) {
        $masterBmp.Save("$dirPath\splash.png", [System.Drawing.Imaging.ImageFormat]::Png)
        Write-Output "Updated splash: $dirPath\splash.png"
    }
}

# 3. Iconos Launcher Android (ic_launcher.png, ic_launcher_round.png, ic_launcher_foreground.png)
$mipmaps = @{
    "mipmap-mdpi"    = @{ Size = 48;  FgSize = 108 }
    "mipmap-hdpi"    = @{ Size = 72;  FgSize = 162 }
    "mipmap-xhdpi"   = @{ Size = 96;  FgSize = 216 }
    "mipmap-xxhdpi"  = @{ Size = 144; FgSize = 324 }
    "mipmap-xxxhdpi" = @{ Size = 192; FgSize = 432 }
}

# Para el foreground de Adaptive Icon, el logo circular debe ocupar el 70% del canvas para caer en la zona segura (safe zone)
foreach ($m in $mipmaps.Keys) {
    $size = $mipmaps[$m].Size
    $fgSize = $mipmaps[$m].FgSize
    $targetDir = "$resDir\$m"

    # A) ic_launcher.png (cuadrado estándar con bordes redondeados sutiles)
    $launcherBmp = New-ResizedBitmap -Image $masterBmp -Width $size -Height $size -SrcRect (New-Object System.Drawing.Rectangle(0, 0, $masterSize, $masterSize))
    $launcherBmp.Save("$targetDir\ic_launcher.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $launcherBmp.Dispose()

    # B) ic_launcher_round.png (recorte circular)
    $roundBmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $gRound = [System.Drawing.Graphics]::FromImage($roundBmp)
    $gRound.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $gRound.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddEllipse(0, 0, $size, $size)
    $gRound.SetClip($path)
    $gRound.DrawImage($masterBmp, (New-Object System.Drawing.Rectangle(0, 0, $size, $size)), (New-Object System.Drawing.Rectangle(0, 0, $masterSize, $masterSize)), [System.Drawing.GraphicsUnit]::Pixel)
    $gRound.Dispose()
    $path.Dispose()
    $roundBmp.Save("$targetDir\ic_launcher_round.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $roundBmp.Dispose()

    # C) ic_launcher_foreground.png (logo centrado al 70% dentro de fgSize para respetar la safe zone de Android Adaptive Icons)
    $fgBmp = New-Object System.Drawing.Bitmap($fgSize, $fgSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $gFg = [System.Drawing.Graphics]::FromImage($fgBmp)
    $gFg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $gFg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $gFg.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $safeInnerSize = [int]($fgSize * 0.72)
    $offset = [int](($fgSize - $safeInnerSize) / 2)
    $destFgRect = New-Object System.Drawing.Rectangle($offset, $offset, $safeInnerSize, $safeInnerSize)
    $gFg.DrawImage($masterBmp, $destFgRect, (New-Object System.Drawing.Rectangle(0, 0, $masterSize, $masterSize)), [System.Drawing.GraphicsUnit]::Pixel)
    $gFg.Dispose()
    $fgBmp.Save("$targetDir\ic_launcher_foreground.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $fgBmp.Dispose()

    Write-Output "Generated launcher icons for $m (Size: ${size}x${size}, Fg: ${fgSize}x${fgSize})"
}

# 4. Actualizar color de fondo del launcher adaptive icon para que combine con el pergamino
$colorXmlPath = "$resDir\values\ic_launcher_background.xml"
$colorXmlContent = @"
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#F1DAAE</color>
</resources>
"@
Set-Content -Path $colorXmlPath -Value $colorXmlContent -Encoding UTF8
Write-Output "Updated ic_launcher_background color to #F1DAAE"

$src.Dispose()
$masterBmp.Dispose()
Write-Output "ALL APP ICONS AND SPLASH SCREENS GENERATED SUCCESSFULLY!"
