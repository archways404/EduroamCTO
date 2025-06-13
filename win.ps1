$arch = (Get-CimInstance Win32_OperatingSystem).OSArchitecture
$zipName = if ($arch -eq "64-bit") { "eduroam-cto-win-x64.zip" } else { "eduroam-cto-win-x86.zip" }
$exeName = if ($arch -eq "64-bit") { "eduroam-cto-win-x64.exe" } else { "eduroam-cto-win-x86.exe" }

$downloadUrl = "https://github.com/archways404/EduroamCTO/releases/download/0.0.1/$zipName"
$zipPath = "$env:TEMP\$zipName"
$exePath = "$env:TEMP\$exeName"

Write-Host "📦 Downloading $zipName..."

# Get total size
$response = Invoke-WebRequest -Uri $downloadUrl -Method Head
$totalBytes = [int64]$response.Headers["Content-Length"]

# Manual download with progress
$reader = [System.Net.HttpWebRequest]::Create($downloadUrl)
$responseStream = $reader.GetResponse().GetResponseStream()
$fileStream = [System.IO.File]::Create($zipPath)

$buffer = New-Object byte[] 8192
$totalRead = 0
while (($read = $responseStream.Read($buffer, 0, $buffer.Length)) -gt 0) {
    $fileStream.Write($buffer, 0, $read)
    $totalRead += $read
    $percent = [math]::Round(($totalRead / $totalBytes) * 100)
    Write-Progress -Activity "Downloading ZIP..." -Status "$percent% Complete" -PercentComplete $percent
}

$fileStream.Close()
$responseStream.Close()

Write-Host "`n✅ ZIP download complete."

# Extract ZIP
Write-Host "📦 Extracting..."
Expand-Archive -Path $zipPath -DestinationPath $env:TEMP -Force

# Run binary
Write-Host "🚀 Running $exeName..."
Start-Process -FilePath $exePath -Wait