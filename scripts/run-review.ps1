#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Multi-Agent Code Review Runner for IT Asset Inventory
    Runs 5 specialist agents in parallel, then compiles into Final Report

.USAGE
    # Review the whole project
    .\scripts\run-review.ps1

    # Review a single agent only
    .\scripts\run-review.ps1 -Agent security

    # Custom output directory
    .\scripts\run-review.ps1 -OutputDir "docs/review/2026-06-27"

    # Dry run (no AI calls)
    .\scripts\run-review.ps1 -DryRun
#>

param(
    [string]$Agent = "all",
    [string]$OutputDir = "docs/review",
    [switch]$DryRun = $false
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$ReviewScripts = Join-Path $PSScriptRoot "review"
$OutputPath = Join-Path $ProjectRoot $OutputDir
$Timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"

function Write-Header($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }
function Write-Success($msg) { Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Fail($msg) { Write-Host "[FAIL] $msg" -ForegroundColor Red }
function Write-Info($msg) { Write-Host "[INFO] $msg" -ForegroundColor Gray }

Write-Header "Multi-Agent Code Review - IT Asset Inventory"
Write-Info "Project root: $ProjectRoot"
Write-Info "Output dir:   $OutputPath"
Write-Info "Timestamp:    $Timestamp"

if (-not (Test-Path $OutputPath)) {
    New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
    Write-Success "Created output dir: $OutputPath"
}

function Get-FileContent([string]$Path) {
    return [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
}

function Get-CodebaseSnapshot {
    Write-Info "Collecting codebase snapshot..."
    $snapshot = [System.Collections.Generic.List[string]]::new()

    $backendSrc = Join-Path $ProjectRoot "backend\src"
    if (Test-Path $backendSrc) {
        foreach ($f in (Get-ChildItem -Path $backendSrc -Recurse -Include "*.ts")) {
            $relPath = $f.FullName.Replace($ProjectRoot, "")
            $snapshot.Add("### FILE: $relPath")
            $snapshot.Add((Get-FileContent $f.FullName))
            $snapshot.Add("")
        }
    }

    $prismaSchema = Join-Path $ProjectRoot "backend\prisma\schema.prisma"
    if (Test-Path $prismaSchema) {
        $snapshot.Add("### FILE: \backend\prisma\schema.prisma")
        $snapshot.Add((Get-FileContent $prismaSchema))
        $snapshot.Add("")
    }

    $frontendSrc = Join-Path $ProjectRoot "frontend\src"
    if (Test-Path $frontendSrc) {
        foreach ($f in (Get-ChildItem -Path $frontendSrc -Recurse -Include "*.tsx","*.ts")) {
            $relPath = $f.FullName.Replace($ProjectRoot, "")
            $snapshot.Add("### FILE: $relPath")
            $snapshot.Add((Get-FileContent $f.FullName))
            $snapshot.Add("")
        }
    }

    $dockerCompose = Join-Path $ProjectRoot "docker-compose.yml"
    if (Test-Path $dockerCompose) {
        $snapshot.Add("### FILE: \docker-compose.yml")
        $snapshot.Add((Get-FileContent $dockerCompose))
        $snapshot.Add("")
    }

    return $snapshot -join "`n"
}

function Invoke-Agent {
    param(
        [string]$AgentName,
        [string]$PromptFile,
        [string]$Codebase,
        [string]$OutFile
    )

    Write-Info "Running $AgentName..."

    $promptContent = Get-FileContent $PromptFile
    $fullPrompt = "$promptContent`n`n---`n`n$Codebase"

    if ($DryRun) {
        Write-Warn "[DRY RUN] $AgentName -> $OutFile"
        return "[DRY RUN] No output for $AgentName"
    }

    $tempInput = Join-Path $env:TEMP "review_input_${AgentName}.txt"
    [System.IO.File]::WriteAllText($tempInput, $fullPrompt, [System.Text.Encoding]::UTF8)

    try {
        # Use cmd /c to pipe file content into gemini via stdin
        $result = cmd /c "gemini < `"$tempInput`"" 2>&1
        $resultText = if ($result -is [array]) { $result -join "`n" } else { "$result" }
        [System.IO.File]::WriteAllText($OutFile, $resultText, [System.Text.Encoding]::UTF8)
        Write-Success "$AgentName complete -> $(Split-Path -Leaf $OutFile)"
        return $resultText
    }
    catch {
        $errMsg = "ERROR: $AgentName failed - $_"
        Write-Fail $errMsg
        $errMsg | Set-Content -Path $OutFile -Encoding UTF8
        return $errMsg
    }
    finally {
        if (Test-Path $tempInput) { Remove-Item $tempInput -Force }
    }
}

$codebase = Get-CodebaseSnapshot
$sizeKB = [math]::Round($codebase.Length / 1KB, 1)
Write-Info "Snapshot size: ${sizeKB} KB"

$agents = @(
    @{ Name = "ux";       Label = "UX Analyst";       PromptFile = "agent1-ux.md";       OutFile = "agent1-ux-report.md" },
    @{ Name = "ba";       Label = "Business Analyst";  PromptFile = "agent2-ba.md";       OutFile = "agent2-ba-report.md" },
    @{ Name = "qa";       Label = "QA Engineer";       PromptFile = "agent3-qa.md";       OutFile = "agent3-qa-report.md" },
    @{ Name = "security"; Label = "Security Auditor";  PromptFile = "agent4-security.md"; OutFile = "agent4-security-report.md" },
    @{ Name = "data";     Label = "Data Inspector";    PromptFile = "agent5-data.md";     OutFile = "agent5-data-report.md" }
)

if ($Agent -ne "all") {
    $agents = $agents | Where-Object { $_.Name -eq $Agent }
    if ($null -eq $agents -or $agents.Count -eq 0) {
        Write-Fail "Unknown agent: '$Agent'. Valid options: all, ux, ba, qa, security, data"
        exit 1
    }
}

Write-Header "Phase 1: Running specialist agents"

$reports = @{}

foreach ($a in $agents) {
    $outFile = Join-Path $OutputPath $a.OutFile
    $promptFile = Join-Path $ReviewScripts $a.PromptFile

    if (-not (Test-Path $promptFile)) {
        Write-Warn "Prompt not found: $($a.PromptFile) - skipping $($a.Label)"
        continue
    }

    $result = Invoke-Agent `
        -AgentName $a.Label `
        -PromptFile $promptFile `
        -Codebase $codebase `
        -OutFile $outFile

    $reports[$a.Name] = $result
}

if ($Agent -eq "all") {
    Write-Header "Phase 2: Compiling Final Report"

    $allReports = [System.Collections.Generic.List[string]]::new()
    $allReports.Add("# Combined Reports from Agent 1-5")
    $allReports.Add("Generated: $Timestamp")
    $allReports.Add("")

    foreach ($a in $agents) {
        $reportFile = Join-Path $OutputPath $a.OutFile
        if (Test-Path $reportFile) {
            $allReports.Add("---")
            $allReports.Add((Get-FileContent $reportFile))
            $allReports.Add("")
        }
    }

    $combinedReports = $allReports -join "`n"
    $compilerPrompt = Join-Path $ReviewScripts "agent6-compiler.md"
    $finalReport = Join-Path $OutputPath "final-review-report.md"

    if ($DryRun) {
        Write-Warn "[DRY RUN] Would compile final report -> $finalReport"
    }
    else {
        $compilerPromptContent = Get-FileContent $compilerPrompt
        $fullCompilerPrompt = "$compilerPromptContent`n`n---`n`n$combinedReports"
        $tempInput = Join-Path $env:TEMP "review_compiler_input.txt"

        try {
            [System.IO.File]::WriteAllText($tempInput, $fullCompilerPrompt, [System.Text.Encoding]::UTF8)
            $finalResult = cmd /c "gemini < `"$tempInput`"" 2>&1
            $finalText = if ($finalResult -is [array]) { $finalResult -join "`n" } else { "$finalResult" }
            [System.IO.File]::WriteAllText($finalReport, $finalText, [System.Text.Encoding]::UTF8)
            Write-Success "Final report -> $finalReport"
        }
        catch {
            Write-Fail "Compiler failed: $_"
        }
        finally {
            if (Test-Path $tempInput) { Remove-Item $tempInput -Force }
        }
    }
}

Write-Header "Done"
Write-Info "Reports in: $OutputPath"
if (Test-Path $OutputPath) {
    Get-ChildItem -Path $OutputPath -Filter "*.md" | ForEach-Object {
        $sizeKB = [math]::Round($_.Length / 1KB, 1)
        Write-Info "  $($_.Name) ($sizeKB KB)"
    }
}

Write-Host ""
Write-Host "Open final report with:" -ForegroundColor Cyan
Write-Host "  code `"$OutputPath\final-review-report.md`"" -ForegroundColor White
