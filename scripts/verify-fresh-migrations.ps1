param(
  [string]$DatabaseContainer = "infrapilot_db",
  [string]$BackendImage = "it-asset-inventory-backend:latest"
)

$ErrorActionPreference = "Stop"

function Get-ContainerEnvironmentValue {
  param(
    [string[]]$Entries,
    [string]$Name
  )
  $prefix = "$Name="
  $entry = $Entries | Where-Object { $_.StartsWith($prefix) } | Select-Object -First 1
  if (-not $entry) {
    throw "$Name is not present in container $DatabaseContainer"
  }
  return $entry.Substring($prefix.Length)
}

$containerEnvJson = & docker inspect $DatabaseContainer --format '{{json .Config.Env}}'
if ($LASTEXITCODE -ne 0) {
  throw "Cannot inspect running PostgreSQL container $DatabaseContainer"
}
$containerEnv = @($containerEnvJson | ConvertFrom-Json)
$dbUser = Get-ContainerEnvironmentValue -Entries $containerEnv -Name "POSTGRES_USER"
$dbPassword = Get-ContainerEnvironmentValue -Entries $containerEnv -Name "POSTGRES_PASSWORD"

$network = (& docker inspect $DatabaseContainer --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{end}}').Trim()
if ($LASTEXITCODE -ne 0 -or -not $network) {
  throw "Cannot resolve Docker network for $DatabaseContainer"
}

& docker image inspect $BackendImage *> $null
if ($LASTEXITCODE -ne 0) {
  throw "Backend image $BackendImage is not available. Build it before running this verifier."
}

$tempDatabase = "infrapilot_v1_acceptance_$([DateTime]::UtcNow.ToString('yyyyMMddHHmmss'))"
$escapedUser = [Uri]::EscapeDataString($dbUser)
$escapedPassword = [Uri]::EscapeDataString($dbPassword)
$databaseUrl = "postgresql://${escapedUser}:${escapedPassword}@${DatabaseContainer}:5432/${tempDatabase}?schema=public"

Write-Host "Creating isolated acceptance database $tempDatabase..."
& docker exec -e "PGPASSWORD=$dbPassword" $DatabaseContainer createdb -h 127.0.0.1 -U $dbUser $tempDatabase
if ($LASTEXITCODE -ne 0) {
  throw "Failed to create temporary acceptance database."
}

try {
  Write-Host "Applying production migrations from $BackendImage..."
  & docker run --rm --network $network -e "DATABASE_URL=$databaseUrl" $BackendImage npx prisma migrate deploy
  if ($LASTEXITCODE -ne 0) {
    throw "prisma migrate deploy failed against the fresh acceptance database."
  }

  Write-Host "Checking migration status..."
  & docker run --rm --network $network -e "DATABASE_URL=$databaseUrl" $BackendImage npx prisma migrate status
  if ($LASTEXITCODE -ne 0) {
    throw "prisma migrate status reported an incomplete schema."
  }

  Write-Host "Fresh production migration verification passed." -ForegroundColor Green
}
finally {
  Write-Host "Dropping isolated acceptance database $tempDatabase..."
  & docker exec -e "PGPASSWORD=$dbPassword" $DatabaseContainer dropdb --if-exists -h 127.0.0.1 -U $dbUser $tempDatabase
}
