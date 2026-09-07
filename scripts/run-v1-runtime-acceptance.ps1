param(
  [string]$ProjectName = "infrapilot-v1-acceptance",
  [string]$InternalIp = ""
)

# Native tools such as Docker and npm legitimately write warnings to stderr.
# Treat their numeric exit codes as authoritative instead of promoting stderr warnings
# to terminating PowerShell errors.
$ErrorActionPreference = "Continue"
$repoRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $repoRoot ".scratch/v1-runtime-acceptance.env"
$evidenceDir = Join-Path $repoRoot ".scratch/v1-evidence"
$playwrightLog = Join-Path $evidenceDir "playwright-full.log"
$runtimeLog = Join-Path $evidenceDir "runtime-summary.txt"
$loginBody = Join-Path $repoRoot ".scratch/v1-login-body.json"
$loginHeaders = Join-Path $repoRoot ".scratch/v1-login-headers.txt"

if (-not $InternalIp) {
  $networkConfig = Get-NetIPConfiguration |
    Where-Object { $_.IPv4DefaultGateway -and $_.IPv4Address } |
    Sort-Object InterfaceMetric |
    Select-Object -First 1
  if (-not $networkConfig) {
    throw "Unable to determine an internal IPv4 address with a default gateway."
  }
  $InternalIp = $networkConfig.IPv4Address.IPAddress
}
$BaseUrl = "https://$InternalIp"

function Assert-Condition {
  param([bool]$Condition, [string]$Message)
  if (-not $Condition) { throw $Message }
}

function Get-DotEnvValue {
  param([string]$Name)
  $line = Get-Content (Join-Path $repoRoot ".env") |
    Where-Object { $_ -match "^$([regex]::Escape($Name))=" } |
    Select-Object -First 1
  if (-not $line) { throw "$Name is required in the root .env for runtime acceptance." }
  $value = ($line -split '=', 2)[1].Trim()
  if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
    $value = $value.Substring(1, $value.Length - 2)
  }
  if (-not $value) { throw "$Name must not be empty in the root .env." }
  return $value
}

function New-RandomHex {
  param([int]$Bytes)
  $buffer = New-Object byte[] $Bytes
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($buffer)
  return -join ($buffer | ForEach-Object { $_.ToString('x2') })
}

function Invoke-Compose {
  & docker compose --project-name $ProjectName --env-file $envFile @args
  if ($LASTEXITCODE -ne 0) { throw "docker compose $($args -join ' ') failed with exit code $LASTEXITCODE" }
}

function Get-PersistenceDigest {
  $sql = @'
SELECT concat_ws('|',
  (SELECT count(*)::text FROM "User"),
  (SELECT count(*)::text FROM "Application"),
  (SELECT count(*)::text FROM "Asset"),
  (SELECT count(*)::text FROM "VmInventory"),
  (SELECT count(*)::text FROM "DatabaseInventory"),
  (SELECT count(*)::text FROM "KnowledgeDocument"),
  (SELECT count(*)::text FROM "Credential" WHERE "encryptedPassword" <> ''),
  (SELECT count(*)::text FROM "VmGuestAccount" WHERE "encryptedPassword" <> ''),
  (SELECT count(*)::text FROM "DatabaseAccount" WHERE "encryptedPassword" <> ''),
  (SELECT count(*)::text FROM "ApplicationComponentAsset"),
  (SELECT count(*)::text FROM "ApplicationComponentVm")
);
'@
  $digest = $sql | & docker compose --project-name $ProjectName --env-file $envFile exec -T postgres sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At'
  if ($LASTEXITCODE -ne 0) { throw "Unable to read persistence digest." }
  return ($digest | Select-Object -Last 1).Trim()
}

function Get-UploadFileCount {
  $count = & docker compose --project-name $ProjectName --env-file $envFile exec -T backend sh -lc "find /app/uploads -type f 2>/dev/null | wc -l"
  if ($LASTEXITCODE -ne 0) { throw "Unable to inspect backend uploads volume." }
  return [int](($count | Select-Object -Last 1).Trim())
}

function Assert-HttpsRuntime {
  $live = "000"
  for ($attempt = 1; $attempt -le 30; $attempt++) {
    $live = & curl.exe --noproxy "*" -k -s --connect-timeout 2 -o NUL -w "%{http_code}" "$BaseUrl/api/health/live"
    if ($live -eq "200") { break }
    Start-Sleep -Seconds 1
  }
  Assert-Condition ($live -eq "200") "HTTPS liveness returned HTTP $live instead of 200 after bounded startup retries."

  $ready = & curl.exe --noproxy "*" -k -s --connect-timeout 2 -o NUL -w "%{http_code}" "$BaseUrl/api/health/ready"
  Assert-Condition ($ready -eq "200") "HTTPS readiness returned HTTP $ready instead of 200."

  $redirectHeaders = & curl.exe --noproxy "*" -s --connect-timeout 2 -o NUL -D - --max-redirs 0 "http://$InternalIp/"
  $redirectText = $redirectHeaders -join "`n"
  Assert-Condition ($redirectText -match "HTTP/1\.[01] (301|308)") "HTTP endpoint did not return a permanent redirect."
  $escapedIp = [regex]::Escape($InternalIp)
  Assert-Condition ($redirectText -match "(?im)^Location:\s*https://$escapedIp/") "HTTP redirect did not target HTTPS on the internal IP."
}

function Assert-SecureLoginCookie {
  $payload = @{ username = 'admin'; password = $script:adminPassword } | ConvertTo-Json -Compress
  [System.IO.File]::WriteAllText($loginBody, $payload, (New-Object System.Text.UTF8Encoding($false)))
  try {
    $status = & curl.exe --noproxy "*" -k -s -o NUL -D $loginHeaders -w "%{http_code}" -H "Content-Type: application/json" --data-binary "@$loginBody" "$BaseUrl/api/auth/login"
    Assert-Condition ($status -eq "200") "Admin login over HTTPS returned HTTP $status."
    $headers = Get-Content $loginHeaders -Raw
    Assert-Condition ($headers -match "(?im)^Set-Cookie:\s*access_token=") "Login did not set the authentication cookie."
    Assert-Condition ($headers -match "(?im)^Set-Cookie:.*\bSecure\b") "Authentication cookie is missing Secure."
    Assert-Condition ($headers -match "(?im)^Set-Cookie:.*\bHttpOnly\b") "Authentication cookie is missing HttpOnly."
    Assert-Condition ($headers -match "(?im)^Set-Cookie:.*SameSite=Lax") "Authentication cookie is missing SameSite=Lax."
  }
  finally {
    Remove-Item $loginBody, $loginHeaders -Force -ErrorAction SilentlyContinue
  }
}

New-Item -ItemType Directory -Force -Path (Split-Path $envFile -Parent), $evidenceDir | Out-Null
$script:adminPassword = Get-DotEnvValue 'DEFAULT_ADMIN_PASSWORD'
$editorPassword = Get-DotEnvValue 'DEFAULT_EDITOR_PASSWORD'
$viewerPassword = Get-DotEnvValue 'DEFAULT_VIEWER_PASSWORD'

$postgresPassword = New-RandomHex 24
$jwtSecret = New-RandomHex 48
$credentialKey = New-RandomHex 32
$bootstrapSecret = New-RandomHex 32

$envText = @"
POSTGRES_USER=infrapilot_acceptance
POSTGRES_PASSWORD=$postgresPassword
POSTGRES_DB=infrapilot_v1_acceptance
JWT_SECRET=$jwtSecret
CREDENTIAL_ENCRYPTION_KEY=$credentialKey
BOOTSTRAP_SECRET=$bootstrapSecret
APP_HOST=$InternalIp
FRONTEND_URL=$BaseUrl
NEXT_PUBLIC_API_URL=/api
VCENTER_ALLOWED_HOSTS=vcenter.development.local,failed-vcenter.e2e.invalid
"@
[System.IO.File]::WriteAllText($envFile, $envText, (New-Object System.Text.UTF8Encoding($false)))

$oldEnv = @{
  DEFAULT_ADMIN_PASSWORD = $env:DEFAULT_ADMIN_PASSWORD
  DEFAULT_EDITOR_PASSWORD = $env:DEFAULT_EDITOR_PASSWORD
  DEFAULT_VIEWER_PASSWORD = $env:DEFAULT_VIEWER_PASSWORD
  PLAYWRIGHT_BASE_URL = $env:PLAYWRIGHT_BASE_URL
  PLAYWRIGHT_IGNORE_HTTPS_ERRORS = $env:PLAYWRIGHT_IGNORE_HTTPS_ERRORS
}

$env:DEFAULT_ADMIN_PASSWORD = $script:adminPassword
$env:DEFAULT_EDITOR_PASSWORD = $editorPassword
$env:DEFAULT_VIEWER_PASSWORD = $viewerPassword
$env:PLAYWRIGHT_BASE_URL = $BaseUrl
$env:PLAYWRIGHT_IGNORE_HTTPS_ERRORS = 'true'

$startedAt = Get-Date
$success = $false
$failure = $null
Push-Location $repoRoot
try {
  foreach ($port in 80, 443) {
    $listeners = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
    Assert-Condition (-not $listeners) "TCP port $port is already in use; isolated HTTPS acceptance cannot start safely."
  }

  & docker compose --project-name $ProjectName --env-file $envFile down -v --remove-orphans 2>$null | Out-Null

  Write-Host "[1/7] Building production images..." -ForegroundColor Cyan
  Invoke-Compose build backend frontend

  Write-Host "[2/7] Starting isolated PostgreSQL..." -ForegroundColor Cyan
  Invoke-Compose up -d --wait postgres

  Write-Host "[3/7] Applying migrations and deterministic acceptance seed..." -ForegroundColor Cyan
  Invoke-Compose run --rm backend npx prisma migrate deploy
  Invoke-Compose run --rm -e NODE_ENV=development -e ALLOW_DEVELOPMENT_SEED=true -e DEFAULT_ADMIN_PASSWORD -e DEFAULT_EDITOR_PASSWORD -e DEFAULT_VIEWER_PASSWORD backend npx ts-node --project prisma/tsconfig.seed.json prisma/seed.ts

  Write-Host "[4/7] Starting Backend, Frontend, and HTTPS gateway..." -ForegroundColor Cyan
  Invoke-Compose up -d --wait backend frontend gateway
  Assert-HttpsRuntime
  Assert-SecureLoginCookie

  Write-Host "[5/7] Running the complete Playwright suite serially..." -ForegroundColor Cyan
  Push-Location (Join-Path $repoRoot 'frontend')
  try {
    & npm run test:e2e -- --workers=1 --retries=0 *> $playwrightLog
    $playwrightExit = $LASTEXITCODE
  }
  finally { Pop-Location }
  if ($playwrightExit -ne 0) {
    Write-Host "Playwright failed. Tail of raw evidence:" -ForegroundColor Red
    Get-Content $playwrightLog -Tail 120
    throw "Full Playwright suite failed with exit code $playwrightExit. Raw log: $playwrightLog"
  }

  Write-Host "[6/7] Proving restart/recreate persistence..." -ForegroundColor Cyan
  Invoke-Compose exec -T backend sh -lc "mkdir -p /app/uploads/acceptance && printf 'v1-persistence' > /app/uploads/acceptance/persistence-marker.txt"
  $digestBefore = Get-PersistenceDigest
  $uploadsBefore = Get-UploadFileCount
  Assert-Condition ($uploadsBefore -ge 1) "Expected at least one persisted upload file before recreation."

  Invoke-Compose up -d --force-recreate --wait postgres backend frontend gateway
  Assert-HttpsRuntime
  Assert-SecureLoginCookie

  $digestAfter = Get-PersistenceDigest
  $uploadsAfter = Get-UploadFileCount
  Assert-Condition ($digestAfter -eq $digestBefore) "Database persistence digest changed across container recreation. Before=$digestBefore After=$digestAfter"
  Assert-Condition ($uploadsAfter -eq $uploadsBefore) "Upload file count changed across container recreation. Before=$uploadsBefore After=$uploadsAfter"
  Invoke-Compose exec -T backend sh -lc "test -f /app/uploads/acceptance/persistence-marker.txt"

  Write-Host "[7/7] Runtime acceptance complete." -ForegroundColor Green
  $duration = [math]::Round(((Get-Date) - $startedAt).TotalSeconds, 1)
  @"
V1 runtime acceptance: PASS
Base URL: $BaseUrl
Full Playwright suite: PASS (workers=1)
Database persistence digest: $digestAfter
Persisted upload files: $uploadsAfter
HTTPS liveness/readiness: PASS
HTTP -> HTTPS redirect: PASS
Secure/HttpOnly/SameSite auth cookie: PASS
Container recreation persistence: PASS
DurationSeconds: $duration
RawPlaywrightLog: $playwrightLog
"@ | Set-Content $runtimeLog -Encoding UTF8
  $success = $true
}
catch {
  $failure = $_
  Write-Error $_
  Write-Host "Acceptance stack diagnostics:" -ForegroundColor Yellow
  & docker compose --project-name $ProjectName --env-file $envFile ps
  & docker compose --project-name $ProjectName --env-file $envFile logs --tail=80 gateway backend frontend
}
finally {
  Write-Host "Cleaning isolated acceptance stack..." -ForegroundColor DarkGray
  & docker compose --project-name $ProjectName --env-file $envFile down -v --remove-orphans 2>$null | Out-Null
  Remove-Item $envFile, $loginBody, $loginHeaders -Force -ErrorAction SilentlyContinue
  $env:DEFAULT_ADMIN_PASSWORD = $oldEnv.DEFAULT_ADMIN_PASSWORD
  $env:DEFAULT_EDITOR_PASSWORD = $oldEnv.DEFAULT_EDITOR_PASSWORD
  $env:DEFAULT_VIEWER_PASSWORD = $oldEnv.DEFAULT_VIEWER_PASSWORD
  $env:PLAYWRIGHT_BASE_URL = $oldEnv.PLAYWRIGHT_BASE_URL
  $env:PLAYWRIGHT_IGNORE_HTTPS_ERRORS = $oldEnv.PLAYWRIGHT_IGNORE_HTTPS_ERRORS
  Pop-Location
}

if ($success) {
  Get-Content $runtimeLog
  exit 0
}

if ($failure) {
  exit 1
}

exit 1
