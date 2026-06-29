## 🗄️ DATA INTEGRITY REPORT

### Schema / Model Issues
| Table/Model | Field | Issue | Risk Level |
|-------------|-------|-------|------------|
| VmGuestAccount | discoveryId, inventoryId | Both FKs nullable — orphan records possible | Critical |
| VmVCenterSource | syncInterval | Stored as String — arithmetic operations fail | Critical |
| DatabaseInventory | port | Stored as String — should be Int with range 0-65535 | High |
| Asset | environment | Free-form String — should be enum (PROD, UAT, DEV, STAGING) | High |
| DatabaseInventory | environment | Free-form String — should be enum | High |
| DatabaseInventory | status | Free-form String — should be enum (ACTIVE, INACTIVE, MAINTENANCE) | High |
| VmVCenterSource | status | Free-form String — should be enum | High |
| VmInventory | syncState | String — should be enum | High |
| DatabaseAccount | role | Free-form String — should be enum | Medium |
| IPAllocation | type | Free-form String — should be enum (Management, VIP, Backup, Data, IPMI) | Medium |
| VmGuestAccount | accessMethod | Free-form String — should be enum (SSH, RDP, WinRM) | Medium |
| TicketComment | (no updatedAt) | Missing updatedAt field — edited comments have no timestamp | Medium |
| KnowledgeCategory | (no timestamps) | Missing createdAt and updatedAt entirely | Medium |
| AssetAttachment | (no updatedAt) | Missing updatedAt field | Low |
| Asset | customMetadata | Json with no schema validation — anything accepted | Low |
| AssetType | SP | Ambiguous meaning (Service Processor? Storage Pool?) | Low |

---

### Relation & Cascade Rules
| Relation | onDelete | Correct? | Risk |
|----------|----------|----------|------|
| IPAllocation → Asset | Cascade | ✅ | Low |
| Credential → Asset | Cascade | ✅ | Low |
| AssetNote → Asset | Cascade | ✅ | Low |
| AssetAttachment → Asset | Cascade | ✅ | Low |
| Asset → Asset (parent) | Cascade | ⚠️ | High — deleting parent cascades to all children silently |
| AuditLog → User | Restrict (default) | ⚠️ | Deleting user blocked by audit log; hard delete not possible |
| VmInventory → VmDiscovery | SetNull | ✅ | Low |
| VmInventory → VmVCenterSource | SetNull | ✅ | Low |
| VmGuestAccount → VmDiscovery | Cascade | ⚠️ | Both FKs nullable; orphan records possible |
| VmGuestAccount → VmInventory | Cascade | ⚠️ | Same issue |
| Ticket → Asset | No onDelete | ⚠️ | Deleting asset with open tickets blocks deletion |
| Ticket → VmInventory | No onDelete | ⚠️ | Same issue |
| KnowledgeDocument → User | No onDelete | ⚠️ | Deleting user who authored docs blocked |

---

### Transaction Safety
| Operation | Atomic? | Risk |
|-----------|---------|------|
| Asset credential replace (deleteMany + create) | ✅ Yes — $transaction | Low |
| VM Promotion (Discovery → Inventory) | ❌ Unknown / likely not | Critical — partial state on failure |
| Admin demotion count() + update() | ❌ No — TOCTOU | Critical — zero-admin race condition |
| VM concurrent promote same moid | ❌ No app-level guard | High — P2002 unhandled |
| Asset concurrent update | ❌ No version field | High — last-write-wins |

---

### Null / Default Value Issues
- `VmGuestAccount.discoveryId` → Nullable → Required (at least one must be set) → Add NOT NULL with check constraint
- `VmGuestAccount.inventoryId` → Nullable → Required (at least one must be set) → Add NOT NULL with check constraint
- `AuditLog.ipAddress` → Nullable → Should be captured on every auth event → Populate from request.ip in all auth operations
- `Ticket.resolvedAt` → Nullable → Should be auto-set on RESOLVED transition → Add trigger or service-layer enforcement
- `Asset.owner` → Nullable → Should be required for ACTIVE assets → Add validation rule in DTO
- `Ticket.assigneeId` → Nullable → Acceptable but triggers notification on assignment — ensure event emitted

---

### Missing Indexes
- `AuditLog.targetId` → Used in queries by targetId but unindexed → High performance impact on large audit tables
- `VmDiscovery.state` → Frequently filtered (NEEDS_CONTEXT, READY_TO_PROMOTE) → Slow discovery listing at scale
- `Ticket.assigneeId` → Used in listing tickets per assignee → Slow my-tickets queries
- `Ticket.clientId` → Used in listing tickets per client → Slow client-ticket queries
- `Credential.assetId` → Used in asset detail join → Slow on large credential tables

---

### Enum Consistency
| Enum | Values | Business Match | Status |
|------|--------|---------------|--------|
| Role | ADMIN, EDITOR, VIEWER | ✅ Good | Fine |
| AssetType | SERVER, STORAGE, SWITCH, SP, NETWORK | ⚠️ SP ambiguous | Clarify |
| AssetStatus | ACTIVE, INACTIVE, MAINTENANCE, DECOMMISSIONED | ✅ Good | Fine |
| VmPowerState | RUNNING, STOPPED, SUSPENDED | ✅ Good | Fine |
| VmEnvironment | PROD, TEST, UAT | ❌ Missing DEV | Add DEV |
| VmDiscoveryState | NEEDS_CONTEXT, READY_TO_PROMOTE, DRIFTED, ARCHIVED | ✅ Good | Fine |
| VmLifecycleState | DRAFT, ACTIVE, DELETED_IN_VCENTER, ARCHIVED | ✅ Good | Fine |
| VmCriticality | MISSION_CRITICAL, BUSINESS_CRITICAL, STANDARD | ✅ Good | Fine |
| TicketPriority | LOW, MEDIUM, HIGH, CRITICAL | ✅ Good | Fine |
| TicketStatus | OPEN, IN_PROGRESS, WAITING_FOR_CLIENT, RESOLVED, CLOSED | ✅ Good | Fine |
| AuditAction | (many) | ❌ Missing: CREATE_TICKET, UPDATE_TICKET, CLOSE_TICKET, LOGIN_FAILED, EXPORT_DATA | Add missing |

---

### Severity Summary
- Critical: 3 items
  1. VmGuestAccount orphan risk (both FKs nullable)
  2. VmVCenterSource.syncInterval as String (arithmetic failure)
  3. Missing transaction on VM promotion race condition
- High: 9 items
  1. DatabaseInventory.port as String
  2. 5 String fields needing Enums (Asset.environment, DatabaseInventory.environment/status, VmVCenterSource.status, VmInventory.syncState)
  3. User delete RESTRICT with no soft-delete strategy
  4. Missing AuditLog.targetId index
  5. Missing VmDiscovery.state index
- Medium: 8 items
- Low: 6 items
- Total: 26 findings
