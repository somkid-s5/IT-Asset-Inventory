# Session Memory & Architecture Decision Record (ADR)

* **Conversation ID**: `a9647080-30e4-41a5-acef-ab1ec53a611a`
* **Active Role**: Senior DevOps & Backend Security Engineer
* **Status**: Autonomous Execution Authorized by User ("ถ้าเหลืออะไรก็ทำเลย")

---

## Key Architectural Decisions

### 1. Hide Plaintext Guest VM Passwords
- **Decision**: Remove the plaintext `password` property from VM `guestAccounts` in general GET responses. Implement a dedicated reveal endpoint `/api/vm/guest-accounts/:id/reveal` that decrypts the password on-demand, writes a `VIEW_PASSWORD` audit log, and is restricted to `ADMIN` and `EDITOR` roles.
- **Rationale**: Mitigates exposure of infrastructure credentials to unauthorized roles.

### 2. Prevent Cascading Asset / Guest Account Deletions
- **Decision**: Update `backend/prisma/schema.prisma` to set `onDelete: SetNull` for `Asset.parent` (since `parentId` is optional) and `onDelete: Restrict` or `onDelete: SetNull` for `VmGuestAccount` relationships.
- **Rationale**: Prevents accidental mass data loss of child devices, VM records, and credentials when deleting a parent asset.

### 3. Implement User Soft Delete
- **Decision**: Update `users.service.ts` to set `deletedAt = new Date()` instead of running database deletion. Update `AuthService` login, `JwtStrategy` validation, and `UsersService.findAll` to reject or filter out soft-deleted users.
- **Rationale**: Retains audit-trail integrity and prevents orphaned records.

### 4. Prisma Global Exception Mapping
- **Decision**: Map Prisma Client Known Request Errors `P2002` (Unique Constraint), `P2025` (Not Found), and `P2003` (Foreign Key Constraint) to HTTP 409, 404, and 400 respectively in `GlobalExceptionFilter`.
- **Rationale**: Prevents unhandled DB errors from crashing endpoints with generic HTTP 500 status codes.

### 5. Frontend Blank Screen Traps
- **Decision**: Create an `AccessDenied` component and render it on `/dashboard/users` and `/dashboard/audit-logs` for non-admin roles instead of returning `null`.
- **Rationale**: Eliminates empty blank layouts for unauthorized users.

### 6. Strict JWT Configuration
- **Decision**: Throw a configuration error on NestJS bootstrap if `JWT_SECRET` environment variable is not defined.
- **Rationale**: Prevents security lapses on production configurations.

---

## Sprint 1 Checklist & Progress

- [x] Task 1: Clean up plain-text VM guest passwords and implement secure reveal endpoint
  - [x] Update `VmService.mapDiscovery` and `VmService.mapInventory` to hide password
  - [x] Implement `VmService.revealGuestAccountPassword` and update `VmController`
  - [x] Update frontend service and VM detail page to query reveal endpoint
- [x] Task 2: Update Prisma Schema delete relations and run migration
  - [x] Change `Asset.parent` to `onDelete: SetNull`
  - [x] Change `VmGuestAccount.discovery` and `VmGuestAccount.inventory` to `onDelete: SetNull` or `onDelete: Restrict`
  - [x] Run Prisma migration
- [x] Task 3: Implement User Soft Delete
  - [x] Update `users.service.ts` remove method to update `deletedAt`
  - [x] Update `AuthService`, `JwtStrategy`, `DashboardService`, and `UsersService` to filter deactivated users
- [x] Task 4: Catch Prisma database errors in `GlobalExceptionFilter`
- [x] Task 5: Prevent Blank Screen Traps with `AccessDenied` component
- [x] Task 6: Fail startup on missing `JWT_SECRET`
