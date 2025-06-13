$arch = (Get-CimInstance Win32_OperatingSystem).OSArchitecture
$binary = if ($arch -eq "64-bit") { "eduroam-cto-win-x64.exe" } else { "eduroam-cto-win-x86.exe" }

$downloadUrl = "https://github.com/archways404/EduroamCTO/releases/download/0.0.1/$binary"
$downloadPath = "$env:TEMP\$binary"

Write-Host "📦 Downloading $binary..."

$webClient = New-Object System.Net.WebClient

# Register a progress bar
$webClient.DownloadProgressChanged += {
    $percent = $_.ProgressPercentage
    Write-Progress -Activity "Downloading..." -Status "$percent% Complete" -PercentComplete $percent
}

# Start async download
$downloadComplete = $false
$webClient.DownloadFileCompleted += {
    Write-Host "`n✅ Download completed."
    $downloadComplete = $true
}

$webClient.DownloadFileAsync($downloadUrl, $downloadPath)

# Wait for download to finish
while (-not $downloadComplete) {
    Start-Sleep -Milliseconds 100
}

Write-Host "🚀 Running $binary..."
Start-Process -FilePath $downloadPath -Wait