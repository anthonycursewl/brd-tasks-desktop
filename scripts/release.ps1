param(
  [Parameter(Mandatory=$true)]
  [string]$Version,
  [string]$Notes = "",
  [string]$UpdaterBaseUrl = "https://apimalet.breadriuss.com",
  [string]$ApiKey
)

$ErrorActionPreference = "Stop"

# 1. Bump version
Write-Host "[1/5] Bumping version to $Version ..."
(Get-Content src-tauri/tauri.conf.json) -replace '"version": ".*"', "`"version`": `"$Version`"" | Set-Content src-tauri/tauri.conf.json
(Get-Content src-tauri/Cargo.toml) -replace '^version = ".*"', "version = `"$Version`"" | Set-Content src-tauri/Cargo.toml

# 2. Build Tauri
Write-Host "[2/5] Building Tauri (this will take a while)..."
$env:TAURI_SIGNING_PRIVATE_KEY = Get-Content "$env:USERPROFILE\.tauri\taskiti.key" -Raw
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "brd-updater-2026"
npm run tauri build
if ($LASTEXITCODE -ne 0) { throw "Build failed" }

# 3. Find artifacts
Write-Host "[3/5] Locating artifacts..."
$installer = Get-ChildItem -Recurse "src-tauri/target/release/**/*_x64-setup.exe" | Where-Object { $_.Name -like "*$Version*" } | Select-Object -First 1
$sigFile = Get-ChildItem -Recurse "src-tauri/target/release/**/*_x64-setup.exe.sig" | Where-Object { $_.Name -like "*$Version*" } | Select-Object -First 1
if (-not $installer) { throw "Installer not found for version $Version" }
Write-Host "  Installer: $($installer.Name)"
if ($sigFile) {
  Write-Host "  Signature: $($sigFile.Name)"
  $Signature = Get-Content $sigFile.FullName -Raw
} else {
  Write-Host "  Signature: (none - signing not configured)"
  $Signature = ""
}

# 4. Upload to backend
Write-Host "[4/5] Uploading installer to $UpdaterBaseUrl ..."
if ($ApiKey) {
  $boundary = [Guid]::NewGuid().ToString()
  $crlf = "`r`n"
  $bodyStream = New-Object System.IO.MemoryStream
  $sw = New-Object System.IO.StreamWriter($bodyStream)
  $sw.Write("--$boundary$crlf")
  $sw.Write("Content-Disposition: form-data; name=`"file`"; filename=`"$($installer.Name)`"$crlf")
  $sw.Write("Content-Type: application/octet-stream$crlf$crlf")
  $sw.Flush()
  $fileBytes = [System.IO.File]::ReadAllBytes($installer.FullName)
  $bodyStream.Write($fileBytes, 0, $fileBytes.Length)
  $sw.Write("$crlf--$boundary--$crlf")
  $sw.Flush()
  $bodyStream.Position = 0
  $wc = New-Object System.Net.WebClient
  $wc.Headers.Add("Content-Type", "multipart/form-data; boundary=$boundary")
  $wc.Headers.Add("X-API-Key", $ApiKey)
  $wc.UploadData("$UpdaterBaseUrl/releases/upload", "PUT", $bodyStream.ToArray())
  Write-Host "  Uploaded."
} else {
  Write-Host "  Skipped (no ApiKey). Upload manually: $installer"
}

# 5. Publish update
Write-Host "[5/5] Publishing update..."
if ($ApiKey -and $Signature) {
  $body = @{
    version            = $Version
    notes              = $Notes
    platform           = "windows-x86_64"
    signature          = $Signature
    installer_filename = $installer.Name
  } | ConvertTo-Json
  Invoke-RestMethod -Uri "$UpdaterBaseUrl/updates/publish" -Method Post `
    -Body $body -ContentType "application/json" `
    -Headers @{ "X-API-Key" = $ApiKey }
  Write-Host "  Published v$Version."
} else {
  Write-Host "  Skipped (no ApiKey or no signature)."
  Write-Host "  Signature: $Signature"
}

Write-Host "`nDone! v$Version released."
