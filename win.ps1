$arch = (Get-CimInstance Win32_OperatingSystem).OSArchitecture
$binary = if ($arch -eq "64-bit") { "eduroam-cto-win-x64.exe" } else { "eduroam-cto-win-x86.exe" }

$downloadUrl = "https://github.com/archways404/EduroamCTO/releases/download/0.0.1/$binary"
$downloadPath = "$env:TEMP\$binary"

Write-Host "📦 Downloading $binary..."
Invoke-WebRequest -Uri $downloadUrl -OutFile $downloadPath

Write-Host "🚀 Running $binary..."
Start-Process -FilePath $downloadPath -Wait