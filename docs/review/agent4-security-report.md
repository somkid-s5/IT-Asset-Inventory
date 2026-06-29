## 🔒 SECURITY AUDITOR REPORT

### Authentication / Authorization
| Endpoint/Page | Auth Required | Role Check | Current Status | Risk |
|---|---|---|---|---|
| POST /api/auth/register | No | None (X-Registration-Key header only) | REGISTRATION_SECRET optional — if unset, open registration | HIGH |
| POST /api/auth/login | No | None | No per-IP/per-user rate limit, no lockout | HIGH |
| POST /api/auth/logout | No | None | Token not revoked server-side; cookie cleared only | HIGH |
| GET /api/auth/me | JwtAuthGuard | None | Acceptable — identity endpoint | LOW |
| PATCH /api/auth/change-password | JwtAuthGuard | None (no RolesGuard) | Any role can change own password | LOW |
| PATCH /api/auth/profile | JwtAuthGuard | None (no RolesGuard) | Watch avatar SVG bypass | MED |
| GET /uploads/* | None | None | All uploaded files publicly accessible without authentication | CRITICAL |
| GET /api/assets/:id (toDetail) | JwtAuthGuard | Role unclear | Returns decrypted plaintext password in response | CRITICAL |
| POST /api/tickets | JwtAuthGuard | None confirmed | VIEWER can create tickets (no server-side role block confirmed) | MED |
| GET /api/audit-logs | JwtAuthGuard | Role unclear | VIEWER may access full audit log trail | MED |
| POST /api/knowledge-docs | JwtAuthGuard | Role unclear | If VIEWER can create/edit docs, over-privileged | HIGH |

---

### RBAC Coverage
| Role | Can Do | Over-privileged? | Under-privileged? |
|------|--------|-----------------|-------------------|
| ADMIN | Full CRUD, user management, audit logs, all assets | ✅ Appropriate | ✅ No gaps |
| EDITOR | Asset CRUD, ticket mgmt, knowledge docs | ❌ Possibly — if credentials detail returned without role restriction | ✅ Generally appropriate |
| VIEWER | Read assets, dashboard; ticket creation not blocked server-side; may read audit logs | ❌ Yes — ticket creation, possible audit log access, possible knowledge doc write | ✅ No under-privilege |

---

### Sensitive Data Exposure
- `encryptedPassword` (assets/DB/VM accounts) → `assets findOne()` calls `toDetail()` which decrypts and returns plaintext password in API response → **Risk: CRITICAL**
- `/uploads/assets/<uuid>.*` → Served publicly with no auth via ServeStaticModule → Any attachment URL guessable/shareable → **Risk: CRITICAL**
- `KnowledgeDocument.content` → Stored raw, no HTML sanitization → XSS if rendered as HTML → **Risk: HIGH**
- `TicketComment.content` → Stored raw, no sanitization → XSS if rendered as HTML → **Risk: HIGH**
- `customMetadata` JSON field → No sanitization → XSS if rendered in UI → **Risk: HIGH**
- `avatarImage` data-URI → Only checks `startsWith('data:image/')` → Malicious SVG with embedded script passes → **Risk: HIGH**
- `AuditLog.ipAddress` → Field exists but inconsistently populated → Forensic gaps → **Risk: MED**
- `GlobalExceptionFilter` → May leak stack traces in dev mode → Internal path/logic disclosure → **Risk: MED**

---

### Hardcoded Secrets
- `REGISTRATION_SECRET` (env var) → If not set in production, registration endpoint open to anyone → **Action: enforce required env var; fail app startup if missing in production**
- `VmVCenterSource.encryptedPassword` → Encryption algorithm and key management unknown → **Action: audit encryption; verify key rotation capability**
- `encryptedPassword` fields (Assets, DatabaseAccount, VmGuestAccount) → Same unknown algorithm concern → **Action: confirm AES-256-GCM or equivalent with env-managed key**
- JWT secret source → Not visible in provided facts → **Action: confirm JWT_SECRET is env-managed, never committed, rotated periodically**

---

### OWASP Top Issues Found
- [x] **A01 Broken Access Control** — `/uploads/` publicly accessible; VIEWER can create tickets; `findOne()` returns decrypted passwords without confirmed role restriction; logout does not invalidate token
- [x] **A02 Cryptographic Failures** — Encryption algorithm for stored credentials unknown; no token revocation (JWT valid post-logout up to 24h); `secure` cookie flag only set in production
- [x] **A03 Injection (XSS)** — `KnowledgeDocument.content`, `TicketComment.content`, and `customMetadata` stored without sanitization; SVG data-URI avatar bypass
- [x] **A04 Insecure Design** — No server-side token revocation; single global rate limit bucket; no CSRF token
- [x] **A05 Security Misconfiguration** — `crossOriginEmbedderPolicy: false` weakens isolation; `crossOriginResourcePolicy: cross-origin` overly permissive; REGISTRATION_SECRET optional in production
- [x] **A07 Identification/Authentication Failures** — Login brute-force viable (global throttle only); no account lockout; no MFA; JWT not revoked on logout
- [x] **A09 Security Logging Failures** — `ipAddress` not consistently captured on login events; stolen-token usage post-logout undetectable in audit log

---

### Severity Summary
- Critical: 3 items
  1. Plaintext password returned in `findOne()` response
  2. `/uploads/` unauthenticated public access
  3. No server-side JWT revocation on logout
- High: 6 items
  1. Login brute-force (no per-IP limit)
  2. Open registration if `REGISTRATION_SECRET` unset
  3. XSS via unsanitized `KnowledgeDocument.content`
  4. XSS via unsanitized `TicketComment.content`
  5. SVG avatar data-URI bypass
  6. Unknown credential encryption implementation
- Medium: 5 items
  1. VIEWER over-privilege (tickets, audit logs, knowledge docs)
  2. customMetadata XSS risk
  3. Inconsistent `ipAddress` audit logging
  4. `GlobalExceptionFilter` stack trace leakage in dev
  5. `crossOriginEmbedderPolicy: false`
- Low: 3 items
  1. `exposedHeaders: ['set-cookie']` unnecessary
  2. `secure` cookie flag absent in dev
  3. `crossOriginResourcePolicy: cross-origin` overly broad
