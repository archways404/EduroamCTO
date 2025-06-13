$arch = (Get-CimInstance Win32_OperatingSystem).OSArchitecture
$binary = if ($arch -eq "64-bit") { "eduroam-cto-win-x64.exe" } else { "eduroam-cto-win-x86.exe" }

$downloadUrl = "https://github.com/archways404/EduroamCTO/releases/download/0.0.1/$binary"
$downloadPath = "$env:TEMP\$binary"

Write-Host "📦 Downloading $binary..."

# Create the request and get the total size
$response = Invoke-WebRequest -Uri $downloadUrl -Method Head
$totalBytes = [int64]$response.Headers["Content-Length"]

# Download with manual progress bar
$reader = [System.Net.HttpWebRequest]::Create($downloadUrl)
$responseStream = $reader.GetResponse().GetResponseStream()
$fileStream = [System.IO.File]::Create($downloadPath)

$buffer = New-Object byte[] 8192
$bytesRead = 0
$totalRead = 0

while (($bytesRead = $responseStream.Read($buffer, 0, $buffer.Length)) -gt 0) {
    $fileStream.Write($buffer, 0, $bytesRead)
    $totalRead += $bytesRead
    $percent = [math]::Round(($totalRead / $totalBytes) * 100)
    Write-Progress -Activity "Downloading..." -Status "$percent% Complete" -PercentComplete $percent
}

$fileStream.Close()
$responseStream.Close()

Write-Host "`n✅ Download complete."
Write-Host "🚀 Running $binary..."
Start-Process -FilePath $downloadPath -Wait