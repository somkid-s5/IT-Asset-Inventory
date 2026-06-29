# 📋 FINAL REVIEW REPORT — IT Asset Inventory System

> Generated: 2026-06-27  
> Agents: UX Analyst · Business Analyst · QA Engineer · Security Auditor · Data Integrity Inspector

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Total issues found (deduplicated) | **52** |
| Critical | **14** |
| High | **20** |
| Nice-to-have | **12** |
| Remove / Descope | **2** |
| **Overall Readiness** | 🔴 **NOT READY FOR PRODUCTION** |

**Top risk areas:** Sensitive data exposure (plaintext passwords in API), unauthenticated file access, 4 XSS vectors, zero test coverage confirmed, and 7 OWASP Top 10 categories violated.

---

## Top 5 Must-Fix Before Go-Live

1. **Plaintext password returned in `assets findOne()` response** — Any authenticated user calling `GET /api/assets/:id` receives decrypted credentials. Immediate data breach risk. _Reported by: Security_
2. **JWT not revoked on logout** — Stolen session cookie remains valid for up to 24 hours after logout. Combined with public `/uploads/` access, attacker can exfiltrate data long after user logs out. _Reported by: QA, Security_
3. **`/uploads/` unauthenticated public access** — All file attachments publicly accessible by URL with no auth check. Sensitive attachments (contracts, configs) exposed to the internet. _Reported by: Security_
4. **4 XSS vectors** — `KnowledgeDocument.content`, `TicketComment.content`, SVG avatar upload, and `customMetadata` all accept unsanitized input that can execute JavaScript in other users' browsers. _Reported by: QA, Security_
5. **Admin demotion TOCTOU race** — Concurrent demotion of two admins can produce a zero-admin state, permanently locking all users out of admin functions. _Reported by: QA_

---

## Consolidated Issue List

| # | Issue | Found by | Priority | Effort | Action |
|---|-------|----------|----------|--------|--------|
| 1 | Plaintext password returned in `assets findOne()` response | Security | CRITICAL | S | Strip credential fields from toDetail() response |
| 2 | `/uploads/` publicly accessible without auth | Security | CRITICAL | S | Add auth guard to static file serving |
| 3 | No server-side JWT revocation on logout | QA, Security | CRITICAL | M | Implement token blocklist (Redis or DB) |
| 4 | SVG avatar upload bypasses MIME check — XSS vector | QA, Security | CRITICAL | S | Validate MIME server-side; block SVG data-URIs |
| 5 | `KnowledgeDocument.content` no sanitization — stored XSS | QA, Security | CRITICAL | S | Run DOMPurify server-side on save |
| 6 | Admin demotion TOCTOU race — zero-admin state possible | QA | CRITICAL | M | Wrap count()+update() in atomic transaction |
| 7 | `VmGuestAccount`: both FKs nullable — orphan records | Data | CRITICAL | S | Add NOT NULL constraint + migration |
| 8 | Missing transaction on VM promotion (Discovery to Inventory) | Data | CRITICAL | M | Wrap promotion in Prisma $transaction |
| 9 | No asset assignment/return tracking | BA | CRITICAL | L | Add ASSIGNED/RETURNED states + audit events |
| 10 | TICKET actions absent from AuditLog | BA, Security | CRITICAL | M | Extend AuditAction enum; log all ticket mutations |
| 11 | LOGIN_FAILED not tracked in audit log | BA, Security | CRITICAL | S | Log failed login attempts with IP |
| 12 | Ticket status/comment mutations have no `onError` — silent failure | UX, QA | CRITICAL | S | Add onError handlers; surface error toast |
| 13 | No SLA deadline on tickets | BA | CRITICAL | M | Add `dueAt` field + enforcement logic |
| 14 | `DatabaseInventory.status` is plain String (no enum) | BA, Data | CRITICAL | S | Convert to Prisma enum + migration |
| 15 | Login brute-force: only global throttle, not per-IP/user | QA, Security | HIGH | M | Implement per-IP + per-username rate limiting |
| 16 | Open registration if `REGISTRATION_SECRET` not set | BA, Security | HIGH | S | Enforce required env var; fail startup if missing |
| 17 | XSS via unsanitized `TicketComment.content` | QA, Security | HIGH | S | Sanitize on save and on render |
| 18 | `customMetadata` JSON — XSS if rendered | QA, Security | HIGH | S | Sanitize or JSON-encode before render |
| 19 | `IPAllocation.address`: plain String, no IP format validation | QA, Data | HIGH | S | Add IP format validator in DTO |
| 20 | `DatabaseInventory.port`: String, no numeric range validation | QA, Data | HIGH | S | Convert to Int; validate 0-65535 |
| 21 | `VmVCenterSource.syncInterval` stored as String | QA, Data | HIGH | S | Convert to Int; fix arithmetic operations |
| 22 | `AssetAttachment`: no server-side file type or size validation | QA, Security | HIGH | S | Add allowlist MIME check + max size |
| 23 | `findAll()` hard-coded `take:1000` — no pagination | QA | HIGH | M | Implement cursor/offset pagination |
| 24 | No optimistic locking on concurrent asset update | QA, Data | HIGH | M | Add version field; implement optimistic lock |
| 25 | VIEWER over-privilege — can create tickets, may access audit logs | Security | HIGH | M | Audit and tighten RBAC guards per role |
| 26 | "New Ticket" button not role-guarded — VIEWER gets 403 with no explanation | UX | HIGH | S | Hide button from VIEWER; show permission tooltip |
| 27 | User hard-delete breaks audit trail (no soft-delete) | Data | HIGH | M | Add `deletedAt`; change onDelete to soft-delete |
| 28 | Missing index on `AuditLog.targetId` | Data | HIGH | S | Add DB index via Prisma migration |
| 29 | Missing index on `VmDiscovery.state` | Data | HIGH | S | Add DB index via Prisma migration |
| 30 | `Asset.environment` is free-form String | QA, BA, Data | HIGH | S | Convert to enum; validate in DTO |
| 31 | No depreciation / asset value fields (TCO blocked) | BA | HIGH | L | Add financial fields to Asset model |
| 32 | No notification rules implemented | BA | HIGH | L | Design + implement notification engine |
| 33 | Ticket cannot be CLOSED via UI — status orphaned | UX | HIGH | S | Wire CLOSED transition in UI state machine |
| 34 | Asset search placeholder misleads ("IP, SN") but only name searched | UX | HIGH | S | Fix placeholder or expand search scope |
| 35 | No field-level change history | BA, Data | HIGH | XL | Implement change log table |
| 36 | No refresh token — session silently dies on expiry | QA | HIGH | M | Add refresh token flow |
| 37 | Missing index on `Ticket.assigneeId` and `Ticket.clientId` | Data | HIGH | S | Add DB indexes via migration |
| 38 | Ticket duplicate submission — no idempotency guard | QA | HIGH | M | Add idempotency key or duplicate check |
| 39 | Ticket not found — raw unstyled div, no CTA | UX | NICE-TO-HAVE | S | Add styled 404 state with back CTA |
| 40 | VM PENDING empty state missing | UX | NICE-TO-HAVE | S | Add empty-state component |
| 41 | No "last synced" timestamp on dashboard sync button | UX | NICE-TO-HAVE | S | Display `lastSyncedAt` from sync response |
| 42 | Back button uses `router.back()` — breaks on direct link | UX | NICE-TO-HAVE | S | Replace with explicit route push |
| 43 | Breadcrumb "Compute" vs sidebar "Inventory" label mismatch | UX | NICE-TO-HAVE | S | Align labels |
| 44 | New Ticket form: toast-only validation, no inline field errors | UX | NICE-TO-HAVE | S | Add react-hook-form field-level errors |
| 45 | `TicketComment` missing `updatedAt` field | Data | NICE-TO-HAVE | S | Add updatedAt to schema |
| 46 | `KnowledgeCategory` missing timestamps entirely | Data | NICE-TO-HAVE | S | Add createdAt/updatedAt |
| 47 | No knowledge base approval/versioning | BA | NICE-TO-HAVE | L | Add draft/publish states + version history |
| 48 | Asset request/approval workflow | BA | NICE-TO-HAVE | XL | New feature — backlog |
| 49 | Bulk operations (status change, delete, assign) | BA | NICE-TO-HAVE | L | New feature — backlog |
| 50 | Escalation rules for CRITICAL tickets | BA | NICE-TO-HAVE | L | New feature — backlog |
| 51 | Redundant "View Details" in Asset dropdown + row-click | UX | REMOVE | S | Remove dropdown item; keep row-click |
| 52 | Redundant "Manage" button on Ticket rows + row-click | UX | REMOVE | S | Remove button; keep row-click |

---

## Cross-Agent Insights

| Issue | Agents | Combined Risk |
|-------|--------|---------------|
| JWT not revoked on logout | QA + Security | Critical: token reuse undetectable in audit log (OWASP A09); attacker persists access silently |
| XSS in KnowledgeDoc/TicketComment | QA + Security | Critical compounded: stored XSS persists across all sessions |
| SVG avatar MIME bypass | QA + Security | Critical: client-side check only; server accepts malicious SVG payload |
| Login brute-force (no per-IP throttle) | QA + Security | High: one IP consumes shared quota + no lockout = password spray viable |
| Ticket onError missing | UX + QA | High: silent mutation failures cause data inconsistency with no user feedback |
| `DatabaseInventory.status` / `Asset.environment` as String | BA + QA + Data | High: 3 agents flagged — corrupted data reaches production |
| TICKET actions not in AuditLog | BA + Security | Critical compliance: ITSM SOC 2 / ISO 27001 requires ticket mutation audit |
| LOGIN_FAILED not tracked | BA + Security | High: brute-force attempts invisible in audit trail |
| Concurrent race conditions | QA + Data | High: asset update last-write-wins + VM promotion P2002 unhandled |
| `findAll()` take:1000 + missing indexes | QA + Data | High: memory spike risk + slow queries = combined OOM + performance failure |
| No EXPORT_DATA audit action | BA + Security | High: data exfiltration via CSV export completely undetectable |
| Open registration without REGISTRATION_SECRET | BA + Security | High: on public deployment without env var, anyone can self-register |

---

## Recommended Sprint Plan

### Sprint 1 — Pre-deploy Blockers (fix before ANY production deploy)
- [ ] Strip credential fields from `toDetail()` response — prevent plaintext password leak
- [ ] Auth-guard `/uploads/` route — deny unauthenticated file access
- [ ] Implement JWT blocklist on logout (Redis preferred) — stop post-logout token reuse
- [ ] Add server-side MIME validation for avatar uploads — block SVG XSS vector
- [ ] Sanitize `KnowledgeDocument.content` and `TicketComment.content` on save
- [ ] Wrap admin demotion count+update in atomic transaction
- [ ] Add `onError` handlers to `updateStatusMutation` and `commentMutation`
- [ ] Log `LOGIN_FAILED` events with IP address to AuditLog
- [ ] Extend `AuditAction` enum to include all TICKET mutations
- [ ] Enforce `REGISTRATION_SECRET` as required env var; fail startup if missing in production
- [ ] Add NOT NULL constraint to `VmGuestAccount.discoveryId` / `inventoryId`
- [ ] Wrap VM promotion (Discovery to Inventory) in Prisma `$transaction`

### Sprint 2 — High Priority (fix within 2 weeks of go-live)
- [ ] Implement per-IP + per-username rate limiting on login endpoint
- [ ] Sanitize `customMetadata` before render; restrict schema at API boundary
- [ ] Convert `DatabaseInventory.port`, `syncInterval` to Int with validation
- [ ] Convert `Asset.environment`, `DatabaseInventory.status`, `VmVCenterSource.status` to enums
- [ ] Add IP format validation to `IPAllocation.address` DTO
- [ ] Replace `findAll()` take:1000 with cursor-based pagination
- [ ] Add optimistic locking (version field) to Asset updates
- [ ] Add idempotency check to ticket creation
- [ ] Add refresh token flow; replace silent JWT expiry
- [ ] Add DB indexes: `AuditLog.targetId`, `VmDiscovery.state`, `Ticket.assigneeId`, `Ticket.clientId`
- [ ] Tighten VIEWER role RBAC — remove ticket creation and audit log read access
- [ ] Implement soft-delete (`deletedAt`) for User model
- [ ] Wire CLOSED status transition in ticket UI
- [ ] Fix asset search placeholder to match actual search scope
- [ ] Add server-side file type allowlist + size limit to AssetAttachment upload
- [ ] Add `EXPORT_DATA` action to AuditLog
- [ ] Add SLA `dueAt` field to Ticket model + basic enforcement

### Backlog — Nice-to-have
- [ ] Asset assignment/return tracking (ASSIGNED, RETURNED states)
- [ ] Field-level change history (delta log table)
- [ ] Depreciation / asset value financial fields
- [ ] Notification rules engine
- [ ] Knowledge base draft/publish + version history
- [ ] Asset request/approval workflow
- [ ] Bulk operations (status change, delete, assign)
- [ ] Ticket escalation rules
- [ ] Server-side report engine (beyond CSV export)
- [ ] Auto-assignment rules for tickets
- [ ] Full-text search in knowledge base
- [ ] Styled 404 empty states (Ticket not found, VM Pending)
- [ ] Inline field validation on New Ticket form
- [ ] Breadcrumb/sidebar label alignment
- [ ] "Last synced" timestamp on dashboard sync button
- [ ] `TicketComment.updatedAt` + `KnowledgeCategory` timestamps

---

## Items to Remove / Descope

- **Dropdown "View Details" on Asset rows** — Redundant with row-click navigation; remove to simplify interaction model
- **"Manage" button on Ticket rows** — Redundant with row-click; consolidate to single interaction pattern

---

## Individual Agent Reports

| Agent | File |
|-------|------|
| Agent 1 - UX Analyst | [agent1-ux-report.md](./agent1-ux-report.md) |
| Agent 2 - Business Analyst | [agent2-ba-report.md](./agent2-ba-report.md) |
| Agent 3 - QA Engineer | [agent3-qa-report.md](./agent3-qa-report.md) |
| Agent 4 - Security Auditor | [agent4-security-report.md](./agent4-security-report.md) |
| Agent 5 - Data Integrity Inspector | [agent5-data-report.md](./agent5-data-report.md) |
