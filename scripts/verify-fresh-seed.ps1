param(
  [string]$DatabaseContainer = "infrapilot_db",
  [string]$BackendImage = "it-asset-inventory-backend:latest"
)

$ErrorActionPreference = "Stop"

function Get-ContainerEnvironmentValue {
  param([string[]]$Entries, [string]$Name)
  $prefix = "$Name="
  $entry = $Entries | Where-Object { $_.StartsWith($prefix) } | Select-Object -First 1
  if (-not $entry) { throw "$Name is not present in container $DatabaseContainer" }
  return $entry.Substring($prefix.Length)
}

function Assert-QueryCount {
  param(
    [string]$Database,
    [string]$Sql,
    [int]$Minimum,
    [string]$Label,
    [string]$User,
    [string]$Password
  )
  $raw = & docker exec -e "PGPASSWORD=$Password" $DatabaseContainer psql -h 127.0.0.1 -U $User -d $Database -tAc $Sql
  if ($LASTEXITCODE -ne 0) { throw "Failed to query $Label" }
  $count = [int]($raw.Trim())
  if ($count -lt $Minimum) { throw "$Label expected at least $Minimum row(s), found $count" }
  Write-Host "${Label}: $count"
}

$containerEnv = @((& docker inspect $DatabaseContainer --format '{{json .Config.Env}}') | ConvertFrom-Json)
$dbUser = Get-ContainerEnvironmentValue -Entries $containerEnv -Name "POSTGRES_USER"
$dbPassword = Get-ContainerEnvironmentValue -Entries $containerEnv -Name "POSTGRES_PASSWORD"
$network = (& docker inspect $DatabaseContainer --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{end}}').Trim()

& docker image inspect $BackendImage *> $null
if ($LASTEXITCODE -ne 0) { throw "Backend image $BackendImage is not available." }

$tempDatabase = "infrapilot_v1_seed_$([DateTime]::UtcNow.ToString('yyyyMMddHHmmss'))"
$escapedUser = [Uri]::EscapeDataString($dbUser)
$escapedPassword = [Uri]::EscapeDataString($dbPassword)
$databaseUrl = "postgresql://${escapedUser}:${escapedPassword}@${DatabaseContainer}:5432/${tempDatabase}?schema=public"
$testKey = "11" * 32

Write-Host "Creating isolated seeded acceptance database $tempDatabase..."
& docker exec -e "PGPASSWORD=$dbPassword" $DatabaseContainer createdb -h 127.0.0.1 -U $dbUser $tempDatabase
if ($LASTEXITCODE -ne 0) { throw "Failed to create temporary seed database." }

try {
  & docker run --rm --network $network -e "DATABASE_URL=$databaseUrl" $BackendImage npx prisma migrate deploy
  if ($LASTEXITCODE -ne 0) { throw "Migration failed before seed verification." }

  Write-Host "Running development acceptance seed in isolation..."
  & docker run --rm --network $network `
    -e "DATABASE_URL=$databaseUrl" `
    -e "NODE_ENV=development" `
    -e "ALLOW_DEVELOPMENT_SEED=true" `
    -e "DEFAULT_ADMIN_PASSWORD=AcceptanceAdmin2026!" `
    -e "DEFAULT_EDITOR_PASSWORD=AcceptanceEditor2026!" `
    -e "DEFAULT_VIEWER_PASSWORD=AcceptanceViewer2026!" `
    -e "CREDENTIAL_ENCRYPTION_KEY=$testKey" `
    $BackendImage npx ts-node --project prisma/tsconfig.seed.json prisma/seed.ts
  if ($LASTEXITCODE -ne 0) { throw "Development acceptance seed failed." }

  Assert-QueryCount -Database $tempDatabase -Sql 'SELECT count(*) FROM "User";' -Minimum 3 -Label 'Users' -User $dbUser -Password $dbPassword
  Assert-QueryCount -Database $tempDatabase -Sql 'SELECT count(*) FROM "Application" WHERE name = ''Treasury Registry'';' -Minimum 1 -Label 'Treasury Registry application' -User $dbUser -Password $dbPassword
  Assert-QueryCount -Database $tempDatabase -Sql 'SELECT count(*) FROM "Asset" WHERE "assetId" = ''DEV-ASSET-001'';' -Minimum 1 -Label 'Deterministic Asset fixture' -User $dbUser -Password $dbPassword
  Assert-QueryCount -Database $tempDatabase -Sql 'SELECT count(*) FROM "VmInventory" WHERE name = ''vm-prod-01'';' -Minimum 1 -Label 'Deterministic VM fixture' -User $dbUser -Password $dbPassword
  Assert-QueryCount -Database $tempDatabase -Sql 'SELECT count(*) FROM "DatabaseInventory" WHERE name = ''Treasury Registry DB'';' -Minimum 1 -Label 'Deterministic Database fixture' -User $dbUser -Password $dbPassword
  Assert-QueryCount -Database $tempDatabase -Sql 'SELECT count(*) FROM "KnowledgeDocument" WHERE title = ''Getting Started'';' -Minimum 1 -Label 'Deterministic Document fixture' -User $dbUser -Password $dbPassword

  Write-Host "Fresh migration + deterministic development seed verification passed." -ForegroundColor Green
}
finally {
  Write-Host "Dropping isolated seeded acceptance database $tempDatabase..."
  & docker exec -e "PGPASSWORD=$dbPassword" $DatabaseContainer dropdb --if-exists -h 127.0.0.1 -U $dbUser $tempDatabase
}
