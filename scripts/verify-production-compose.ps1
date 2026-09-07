param(
  [string]$EnvFile = "deploy/.env.production.example"
)

$ErrorActionPreference = "Stop"

function Assert-Condition {
  param(
    [bool]$Condition,
    [string]$Message
  )
  if (-not $Condition) {
    throw $Message
  }
}

$repoRoot = Split-Path -Parent $PSScriptRoot
Push-Location $repoRoot
try {
  $json = & docker compose --env-file $EnvFile config --format json
  if ($LASTEXITCODE -ne 0) {
    throw "docker compose config failed for $EnvFile"
  }

  $config = $json | ConvertFrom-Json
  $serviceNames = @($config.services.PSObject.Properties.Name | Sort-Object)
  $expectedServices = @("backend", "frontend", "gateway", "postgres")
  Assert-Condition (($serviceNames -join ",") -eq ($expectedServices -join ",")) (
    "Production Compose services must be exactly: {0}. Found: {1}" -f
      ($expectedServices -join ", "),
      ($serviceNames -join ", ")
  )

  Assert-Condition (-not $config.services.postgres.ports) "PostgreSQL must not publish a host/LAN port."
  $backendVolumeTargets = @($config.services.backend.volumes | ForEach-Object { $_.target })
  Assert-Condition ($backendVolumeTargets -contains "/app/uploads") "Backend uploads must be persisted at /app/uploads."

  foreach ($service in @("postgres", "backend", "frontend", "gateway")) {
    Assert-Condition ([bool]$config.services.$service.healthcheck) "$service must define a healthcheck."
  }

  $backendEnv = $config.services.backend.environment
  Assert-Condition ($backendEnv.COOKIE_SECURE -eq "true") "Backend COOKIE_SECURE must be true."
  Assert-Condition ($backendEnv.VCENTER_MOCK_ENABLED -eq "false") "vCenter mock mode must be disabled in production."
  Assert-Condition (-not $backendEnv.DEFAULT_ADMIN_PASSWORD) "Production backend must not receive DEFAULT_ADMIN_PASSWORD."
  Assert-Condition (-not $backendEnv.DEFAULT_EDITOR_PASSWORD) "Production backend must not receive DEFAULT_EDITOR_PASSWORD."
  Assert-Condition (-not $backendEnv.DEFAULT_VIEWER_PASSWORD) "Production backend must not receive DEFAULT_VIEWER_PASSWORD."

  $frontendEnv = $config.services.frontend.environment
  Assert-Condition ($frontendEnv.NEXT_PUBLIC_API_URL -eq "/api") "Frontend API URL must remain same-origin /api."

  $backendDepends = $config.services.backend.depends_on.postgres.condition
  $frontendDepends = $config.services.frontend.depends_on.backend.condition
  $gatewayFrontendDepends = $config.services.gateway.depends_on.frontend.condition
  $gatewayBackendDepends = $config.services.gateway.depends_on.backend.condition
  Assert-Condition ($backendDepends -eq "service_healthy") "Backend must wait for healthy PostgreSQL."
  Assert-Condition ($frontendDepends -eq "service_healthy") "Frontend must wait for healthy backend."
  Assert-Condition ($gatewayFrontendDepends -eq "service_healthy") "Gateway must wait for healthy frontend."
  Assert-Condition ($gatewayBackendDepends -eq "service_healthy") "Gateway must wait for healthy backend."

  $caddyfile = Get-Content (Join-Path $repoRoot "deploy/Caddyfile") -Raw
  Assert-Condition ($caddyfile -match "tls\s+internal") "Caddy must use an internal TLS certificate for the V1 IP deployment."
  Assert-Condition ($caddyfile -match "redir\s+https://\{host\}\{uri\}") "Caddy must redirect HTTP to HTTPS."
  Assert-Condition ($caddyfile -match "reverse_proxy\s+backend:3001") "Caddy must proxy /api to backend:3001."
  Assert-Condition ($caddyfile -match "reverse_proxy\s+frontend:3000") "Caddy must proxy the application to frontend:3000."

  Write-Host "Production Compose static verification passed." -ForegroundColor Green
  Write-Host "Services: $($serviceNames -join ', ')"
  Write-Host "PostgreSQL host ports: none"
  Write-Host "Backend uploads volume: /app/uploads"
  Write-Host "Same-origin API: /api"
  Write-Host "TLS: Caddy internal CA with HTTP -> HTTPS redirect"
}
finally {
  Pop-Location
}
