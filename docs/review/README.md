# Multi-Agent Code Review System

ระบบ review code อัตโนมัติ โดยใช้ AI specialist agents 6 ตัว วิเคราะห์ codebase จากหลายมุมมองพร้อมกัน

## Architecture

```
Orchestrator (main thread)
├── Agent 1: UX Analyst          → วิเคราะห์ flow, dead-end states, navigation
├── Agent 2: Business Analyst    → วิเคราะห์ business logic, auditability, edge cases
├── Agent 3: QA Engineer         → วิเคราะห์ validation, error handling, test coverage
├── Agent 4: Security Auditor    → วิเคราะห์ auth, RBAC, OWASP, secrets
├── Agent 5: Data Inspector      → วิเคราะห์ schema, transactions, indexes, enums
└── Agent 6: Report Compiler     → รวม output → Final Report
```

## วิธีใช้

### Option A: Antigravity Native (แนะนำ)

พิมพ์ใน chat:
```
run multi-agent review
```
หรือ:
```
audit codebase ทั้งหมด
```

Antigravity จะ spawn subagents แบบ parallel อัตโนมัติ

### Option B: PowerShell Script

```powershell
# Review ทั้งหมด
.\scripts\run-review.ps1

# Review เฉพาะ security
.\scripts\run-review.ps1 -Agent security

# Dry run (ดู flow โดยไม่ call AI)
.\scripts\run-review.ps1 -DryRun

# Custom output directory
.\scripts\run-review.ps1 -OutputDir "docs/review/sprint-1"
```

## Output Files

| File | Description |
|------|-------------|
| `agent1-ux-report.md` | UX flow analysis |
| `agent2-ba-report.md` | Business logic gaps |
| `agent3-qa-report.md` | QA/testing gaps |
| `agent4-security-report.md` | Security vulnerabilities |
| `agent5-data-report.md` | Data integrity issues |
| `final-review-report.md` | Compiled final report |

## Priority System

| Priority | Meaning | Action |
|----------|---------|--------|
| CRITICAL | Block user / security risk / data loss | Fix before deploy |
| HIGH | Business impact, no blocker | Fix this sprint |
| NICE-TO-HAVE | UX improvement / minor gap | Backlog |
| REMOVE | Redundant / scope creep | Cut |

## Prompt Files

Agent prompts อยู่ที่ `scripts/review/`:
- `orchestrator.md` — master orchestration instructions
- `agent1-ux.md` — UX Analyst prompt
- `agent2-ba.md` — Business Analyst prompt
- `agent3-qa.md` — QA Engineer prompt
- `agent4-security.md` — Security Auditor prompt
- `agent5-data.md` — Data Inspector prompt
- `agent6-compiler.md` — Report Compiler prompt
