---
name: multi-agent-review
description: >
  Run a full multi-agent code review on the IT Asset Inventory codebase.
  Spawns 5 specialist subagents (UX, BA, QA, Security, Data) in parallel,
  then compiles all findings into a single Final Report via Agent 6.
  Trigger: "run review", "code review", "audit codebase", "multi-agent review"
---

# Multi-Agent Code Review Skill

## Overview

Spawn 5 specialist subagents in parallel, wait for all to complete, then compile into one Final Report.

```
Orchestrator (main thread)
├── Agent 1: UX Analyst          → docs/review/agent1-ux-report.md
├── Agent 2: Business Analyst    → docs/review/agent2-ba-report.md
├── Agent 3: QA Engineer         → docs/review/agent3-qa-report.md
├── Agent 4: Security Auditor    → docs/review/agent4-security-report.md
├── Agent 5: Data Inspector      → docs/review/agent5-data-report.md
└── Agent 6: Report Compiler     → docs/review/final-review-report.md
```

## Step 1: Read Agent Prompts

Read all 6 prompt files from `scripts/review/`:
- `agent1-ux.md`
- `agent2-ba.md`
- `agent3-qa.md`
- `agent4-security.md`
- `agent5-data.md`
- `agent6-compiler.md`

## Step 2: Collect Codebase Context

Read these key files/directories for each agent:

**All agents need:**
- `backend/src/` — all .ts files
- `backend/prisma/schema.prisma`
- `frontend/src/` — all .tsx/.ts files
- `docker-compose.yml`

**Agent 4 (Security) additionally needs:**
- `backend/src/auth/` — guards, strategies, decorators
- `.env.example` — to check what secrets are expected

**Agent 5 (Data) additionally needs:**
- `backend/prisma/migrations/` — migration history

## Step 3: Spawn Agents 1-5 in Parallel

Use `invoke_subagent` with TypeName="self" for each agent.

Each subagent prompt = agent prompt content + codebase content

Wait for all 5 to complete before proceeding.

## Step 4: Compile Final Report

Feed all 5 reports into Agent 6 subagent.
Save output to `docs/review/final-review-report.md`

## Step 5: Output Summary

Print summary to user:
- Files created
- Total issues found (pull from Final Report)
- Top 3 critical items

## Notes

- Output directory: `docs/review/` (create if not exists)
- Use timestamp in filename if running multiple times: `final-review-report-YYYYMMDD.md`
- If any agent fails, continue with remaining agents and note the failure in compiler input
