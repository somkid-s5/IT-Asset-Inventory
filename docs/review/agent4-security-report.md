## 🔒 SECURITY AUDITOR REPORT

### Authentication / Authorization
| Endpoint/Page | Auth Required | Role Check | Current Status | Risk |
|---------------|---------------|------------|----------------|------|
| POST /api/auth/register | No | None | First registered user gets ADMIN role without registration key check if userCount === 0. Subsequent users require REGISTRATION_SECRET. | Medium |
| POST /api/auth/login | No | None | Rate-limited (10 req/min), verifies bcrypt hash and sets HTTP-only JWT cookie. | Low |
| GET /api/auth/me | Yes | None | Returns current authenticated profile without sensitive fields. | Low |
| GET /api/assets, GET /api/assets/:id | Yes | None | Accessible by any authenticated role (including VIEWER). | Low |
| POST /api/assets, PATCH /api/assets/:id | Yes | ADMIN, EDITOR | Properly restricted to ADMIN and EDITOR roles. | Low |
| DELETE /api/assets/:id | Yes | ADMIN, EDITOR | EDITOR role can permanently delete asset records. | Medium |
| GET /api/credentials/asset/:assetId | Yes | None | Missing @Roles guard; any authenticated role (including VIEWER) can list asset credential metadata. | Medium |
| POST /api/credentials, PATCH /api/credentials/:id | Yes | ADMIN, EDITOR | Protected by role check, but returns full database object including encryptedPassword. | High |
| GET /api/credentials/:id/reveal | Yes | ADMIN, EDITOR | Decrypts and returns plaintext password; records VIEW_PASSWORD audit log. | Low |
| GET /api/databases, GET /api/databases/:id | Yes | None | Accessible by any authenticated role (including VIEWER). | Low |
| DELETE /api/databases/:id | Yes | ADMIN, EDITOR | EDITOR role can permanently delete database inventory records. | Medium |
| GET /api/vm/discoveries/:id, GET /api/vm/inventory/:id | Yes | None | Missing @Roles guard; any authenticated user (including VIEWER) receives decrypted plaintext guest account passwords. | Critical |
| GET /api/users | Yes | ADMIN | Properly protected; only ADMIN role can view user directory. | Low |
| POST /api/users, PATCH /api/users/:id/* | Yes | ADMIN | Properly protected; only ADMIN role can manage users and roles. | Low |
| PATCH /api/tickets/:id | Yes | None | Missing @Roles guard; any authenticated role (including VIEWER) can update ticket status and details. | High |
| GET /api/clients, POST /api/clients, PATCH /api/clients/:id, DELETE /api/clients/:id | Yes | None | ClientsController lacks RolesGuard and @Roles decorators; any authenticated user (including VIEWER) can CRUD clients. | High |
| GET /api/assets/uploads/:filename | No | None | Unauthenticated public handler serving files from uploads/assets directory. | Medium |
| GET /api/audit-logs | Yes | ADMIN, EDITOR | Restricted to ADMIN and EDITOR roles with pagination support. | Low |

### RBAC Coverage
| Role | Permissions | Over-privileged | Under-privileged |
|------|-------------|-----------------|-----------------|
| ADMIN       | Full access across all modules (Users, Assets, Credentials, Databases, VMs, Tickets, Clients, KB, Audit Logs). | ❌ | ✅ |
| EDITOR      | Create, update, and delete access for Assets, Databases, VM Sources/Inventories, Tickets, KB documents, and Credential reveals. | ✅ | ❌ |
| VIEWER      | Read-only access to inventory lists, dashboards, and public documents. | ✅ | ❌ |

### Sensitive Data Exposure
- [guestAccounts.password] → [GET /api/vm/discoveries/:id and GET /api/vm/inventory/:id API response bodies (decrypted in plaintext via VmService.mapDiscovery/mapInventory for any authenticated user including VIEWER)] → [Risk level: HIGH]
- [encryptedPassword] → [POST /api/credentials and PATCH /api/credentials/:id API response bodies (returned directly from Prisma create/update methods)] → [Risk level: HIGH]
- [uploaded asset attachments] → [GET /api/assets/uploads/:filename endpoint (no authentication required)] → [Risk level: MED]

### Hardcoded Secrets
- [backend/src/auth/strategies/jwt.strategy.ts:24] → [JWT Secret Fallback ('super-secret-key')] → [Remove hardcoded fallback string and throw critical configuration error if JWT_SECRET environment variable is missing]

### OWASP Top Issues Found
- [x] A01 Broken Access Control
- [x] A02 Cryptographic Failures
- [ ] A03 Injection (XSS/SQLi)
- [x] A04 Insecure Design
- [x] A05 Security Misconfiguration
- [ ] A07 Identification/Authentication Failures
- [ ] A09 Security Logging Failures

### Severity Summary
- Critical: 1 items
- High: 3 items
- Medium: 3 items
- Low: 2 items
