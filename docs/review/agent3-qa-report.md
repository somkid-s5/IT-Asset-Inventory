## 🧪 QA ENGINEER REPORT

### Validation Coverage
| Field/Input | Required | Format Check | Boundary | XSS Safe | Status |
|-------------|----------|--------------|----------|----------|--------|
| Auth — username | Yes | None | None | N/A | WARN |
| Auth — password | Yes | Minimal (policy unclear) | No min/max enforced | N/A | FAIL |
| Asset.name | Yes | None | None | Yes | WARN |
| Asset.environment | No | None (free-form string) | None | Yes | FAIL |
| Asset.customMetadata (JSON) | No | None — raw JSON accepted | None | FAIL (no sanitization) | FAIL |
| IPAllocation.address | Yes | None — plain String | None | Yes | FAIL |
| DatabaseInventory.port | Yes | None — String, not numeric | 0-65535 not enforced | Yes | FAIL |
| VmVCenterSource.syncInterval | Yes | None — String | None | Yes | FAIL |
| KnowledgeDocument.content | Yes | None | None | FAIL (raw HTML/MD render) | FAIL |
| AssetNote.content | Yes | None — no maxLength | Unbounded | Yes | FAIL |
| AssetAttachment — file type | Yes | None server-side | No size limit visible | N/A | FAIL |
| AssetAttachment — file size | Yes | None server-side | Unbounded | N/A | FAIL |
| AvatarImage — content type | Yes | Only startsWith('data:image/') | None | FAIL (SVG allows JS) | FAIL |
| TicketComment.commentType | No | None (no DB enum) | None | Yes | FAIL |
| Ticket.ticketNo | Yes | None in DTOs | None | Yes | WARN |
| X-Registration-Key header | Yes | Existence check only | None | N/A | WARN |
| CSRF protection | N/A | SameSite=strict only | N/A | Partial | WARN |

---

### Error Handling Matrix
| Scenario | Handled | User Feedback | Risk |
|----------|---------|---------------|------|
| Login — invalid credentials | Unknown (filter catches) | Generic message assumed | Medium |
| JWT expiry (no refresh token) | Cookie maxAge 24h only | Session silently ends | High |
| Logout — JWT still valid in-memory | No server-side revocation | Token reuse after logout | Critical |
| Prisma unique constraint violation | Partial (global filter) | No user-friendly message | High |
| Prisma connection failure | Global filter only | Raw/internal message risk | High |
| Concurrent delete+read on asset | No guard | Unhandled 404 or crash | High |
| File upload — network failure mid-stream | Unknown | No documented fallback | High |
| updateStatusMutation failure (frontend) | No onError handler | Silent failure, stale UI | High |
| commentMutation failure (frontend) | No onError handler | Silent failure | Medium |
| Admin demote — TOCTOU race | Partial (count+update not atomic) | No feedback on race loss | High |
| VmInventory duplicate on concurrent promote | DB @unique catches it | Unhandled DB error thrown | Medium |
| Rate limit exceeded (ThrottlerModule) | Yes | 429 returned | Low |
| change-password — brute force | No lockout | Unlimited retries | Critical |
| KnowledgeDocument XSS render | No sanitization | Script execution in browser | Critical |
| SVG avatar XSS | No MIME deep-check | Script execution in browser | Critical |

---

### Race Condition Risks
- **Admin demotion** → count() then update() not atomic — two concurrent demotions can both pass, leaving zero admins → Wrap in $transaction with SELECT FOR UPDATE
- **VM Promotion** → Two users promoting same moid simultaneously can both pass app-level check before DB @unique fires → Catch P2002 explicitly and return 409; wrap in transaction
- **Asset Concurrent Update** → No optimistic locking — last-write wins silently → Add version field; throw 409 on mismatch
- **Ticket Duplicate Submission** → No idempotency key — double-click creates duplicate tickets → Debounce frontend + idempotency token

---

### Missing Test Cases
- Auth: brute-force login after N attempts → Account takeover via password enumeration → Critical
- Auth: JWT token reuse after logout → Compromised token remains valid for 24h → Critical
- Auth: concurrent admin demotion (2 simultaneous requests) → Zero-admin state possible → Critical
- File upload: malicious SVG with embedded script tag → XSS via avatar/attachment → Critical
- KnowledgeDocument: HTML/script injection in content field → Stored XSS → Critical
- Asset: customMetadata deeply nested JSON payload (DoS) → CPU/memory spike → High
- IPAllocation: invalid IP string (e.g. 999.999.999.999) → Bad data persisted → High
- DatabaseInventory: port > 65535 or negative → Invalid data in DB → High
- AssetAttachment: upload file exceeding expected size limit → No server-side rejection → High
- AssetAttachment: upload executable disguised as image → Malicious file stored → High
- findAll(): 1000-asset load performance test → UI freeze / timeout at scale → High
- Ticket: VIEWER role submitting new ticket via direct API call → Role bypass → High
- VM Promotion: two concurrent users on same VM moid → Duplicate or unhandled error → High
- Asset update: concurrent edits from two users → Silent data loss → Medium
- AssetNote.content: max length boundary → Unbounded DB write → Medium
- Rate limiter: single-bucket exhaustion from one user blocking others → Shared bucket DoS → Medium

---

### Existing Test Coverage Assessment
- [ ] Unit tests present — directory exists but no file list confirmed; coverage level unknown
- [ ] Integration tests present — no evidence of DB-level integration tests observed
- [ ] E2E tests present — no frontend test directory observed; no E2E framework detected
- [ ] API contract tests present — no OpenAPI/Pact test evidence observed

---

### Severity Summary
- Critical: 6 items
  1. JWT reuse after logout (no server-side revocation)
  2. change-password has no brute-force protection / account lockout
  3. SVG avatar upload bypasses MIME check — XSS vector
  4. KnowledgeDocument.content rendered without sanitization — stored XSS
  5. Admin demotion TOCTOU race — zero-admin state possible
  6. customMetadata JSON no sanitization — XSS if rendered
- High: 11 items
- Medium: 8 items
