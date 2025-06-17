param (
    [string]$Username,
    [string]$Password
)

Write-Host "Cleaning up old configuration..."
netsh wlan delete profile name="eduroam" | Out-Null
cmdkey /delete:eduroam | Out-Null

$certFolder = "$PSScriptRoot\certs"
$profileFolder = "$PSScriptRoot\profiles"

# Install certificates
$certs = @(
    "$certFolder\aaa_certificate_services.cer",
    "$certFolder\usertrust_rsa.cer",
    "$certFolder\addtrust_external_root.cer"
)
foreach ($cert in $certs) {
    Write-Host "Importing certificate: $cert"
    Import-Certificate -FilePath $cert -CertStoreLocation Cert:\LocalMachine\Root | Out-Null
}

# Store credentials
Write-Host "Storing credentials in Windows Credential Manager..."
cmdkey /add:eduroam /user:$Username /pass:$Password

# Install clean profile (no embedded creds)
$profilePath = "$profileFolder\eduroam.xml"
Write-Host "Installing Wi-Fi profile: $profilePath"
netsh wlan add profile filename="$profilePath" user=all | Out-Null

Write-Host "`n✅ Eduroam profile added. You should now be able to connect."

# Connect manually
netsh wlan connect name="eduroam"
