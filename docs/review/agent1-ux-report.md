## 🎨 UX ANALYST REPORT

### Flow Completeness

| Feature | Start | Process | Feedback | Status |
|---------|-------|---------|----------|--------|
| Login | Username/Password form | POST /auth/login | Toast success + redirect to /dashboard | ✅ Complete |
| Add Asset | "Add Asset" button (ADMIN/EDITOR only) | Dialog form with tabs | Toast success + table refetch | ✅ Complete |
| Edit Asset | Pencil icon → fetch full asset → open dialog | Pre-populated form | Toast success + table refetch | ✅ Complete |
| Delete Asset | "Delete Asset" dropdown item | Confirmation dialog | Toast success + table refetch | ✅ Complete |
| Create Ticket | "New Ticket" button → /tickets/new | Title + client + priority + metadata form | Toast success + redirect to /tickets | ✅ Complete |
| Update Ticket Status | "Update Status" dropdown | One-click mutation | Toast success | ✅ Complete |
| Add Work Log | Text area in ticket detail | Submit button | Toast success + refetch | ✅ Complete |
| VM Pending Setup | Click row in PENDING view | VmFormDialog | Implied toast + refetch | ⚠️ No explicit success state visible |
| Add Database | "Add Database" button | DatabaseFormDialog | Toast success + refetch | ✅ Complete |
| Delete Database | Dropdown "Delete" item | Confirmation dialog | Toast success + refetch | ✅ Complete |
| Change Password | Profile page form | PATCH /auth/change-password | Toast success | ✅ Complete |
| Update Profile | Profile page form | PATCH /auth/profile | Toast success + updateUser() | ✅ Complete |
| Export CSV (Assets/DBs) | "Export" button | Client-side CSV generation | Toast success or "No data to export" | ✅ Complete |
| vCenter Source sync | Dashboard alert → /virtual-machines/sources | External page | No return feedback in dashboard | ⚠️ Partial |

---

### Dead-end / Missing States

- **Ticket not found** (`/dashboard/tickets/[id]`) → renders raw `<div>Ticket not found</div>` → No styled error page, no CTA to go back, impact: hard block for user
- **Assets tab filter with no results** → EmptyState correct for zero assets, but when filtered by search and no match, EmptyState action button ("Add Your First Asset") is hidden — user has no hint to clear filter
- **VM PENDING view** → when all pending VMs are promoted, no empty state is rendered; shows blank table area without guidance
- **Dashboard `isFetching`** → Sync button shows spinner but no "last synced at" timestamp — user cannot tell if data is stale
- **vCenter Sources page** → alert on dashboard says "vCenter Sync Failed" linking to sources, but no error/success feedback when user manually triggers re-sync
- **Ticket detail — error on status mutation** → `updateStatusMutation` has no `onError` handler — mutation failure is silent (no toast)
- **Comment mutation error** → `commentMutation` has no `onError` handler — submit silently fails
- **Asset detail page** → if asset fetch fails, no visible error boundary below dashboard layout
- **Login loading state** → shows plain "Loading..." text with no spinner or branded indicator

---

### Redundant / Illogical UX

- **Double "View Details" path for Assets** → clicking table row navigates to asset detail, AND "View Details" menu item in MoreHorizontal dropdown goes to same route — remove from dropdown
- **Assets tab filter is client-side only** → no SP or NETWORK tab despite those types existing in schema — user with SP assets sees them only under "All"
- **"Manage" button + row click both navigate to ticket detail** → double click targets are redundant and inconsistent
- **New Ticket page has no "Cancel" button** → user must use browser back; no escape from form
- **Asset search only filters by 'name'** but placeholder says "Search by name, IP, SN..." — IP and SN filtering not implemented
- **"New Ticket" button visible to VIEWER role** → no role-guard; VIEWER clicks → API 403 with no explanation
- **Sidebar active-item click collapses sidebar** instead of doing nothing — counter-intuitive
- **Dashboard `setMounted` pattern** → setTimeout trick for hydration causes 1-frame delay before chart renders

---

### Navigation Issues

- **No "CLOSED" transition from ticket status dropdown** → CLOSED status exists in enum but orphaned in UI; tickets can never be fully closed through the UI
- **vCenter Sources under "System" sidebar section** but logically belongs under "Inventory > Virtual Machines"
- **Breadcrumb shows "Compute > Virtual Machines"** but sidebar section is "Inventory" — label mismatch
- **Asset detail "Back" uses `router.back()`** → if opened in new tab, back() goes to browser home, not /dashboard/assets
- **Profile only accessible via header dropdown** — not in sidebar, deeply buried for frequent action
- **Users and Audit Logs under "System" sidebar** but only visible to ADMIN; non-admin sees empty "System" section

---

### Form Validation Issues

| Form / Field | Problem | Recommendation |
|---|---|---|
| Login / Username + Password | Inline errors shown only after submit, not on blur | Add `mode: 'onBlur'` to useForm |
| New Ticket / Title | Relies on browser native validation; no styled inline error on blur | Use react-hook-form + zod; display styled error |
| New Ticket / ClientName | Validated only on submit via toast.error, not inline | Move validation inline |
| AssetFormDialog / IP Address | Validated on submit only | Validate on blur per-field |
| AssetFormDialog / Password fields | No show/password toggle aria-label | Add `aria-label="Show password"` |
| Profile / New Password | Policy shown only after submit via toast | Show requirements inline before typing |
| Profile / Confirm Password | Mismatch detected only on submit | Validate on blur with inline message |
| DatabaseFormDialog | No validation pattern visible — likely toast-only | Audit and apply inline validation |

---

### Severity Summary
- Critical: 5 items
  1. Ticket status mutation no onError — silent failure
  2. Comment mutation no onError — silent failure
  3. "New Ticket" button not role-guarded — VIEWER gets 403 with no explanation
  4. Ticket CLOSED status orphaned in UI dropdown
  5. Asset search placeholder misleads ("IP, SN") but only name is searchable
- Warning: 9 items
- Info: 6 items
