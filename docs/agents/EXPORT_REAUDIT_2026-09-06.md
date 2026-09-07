# Sensitive Inventory Export Re-Audit — 2026-09-06

Scope: Ticket 11 `docs/tickets/v1/11-generate-sensitive-inventory-workbook.md` traced against export API authorization, re-authentication, passphrase handling, workbook structure, OOXML file encryption, credential decryption, audit logging, UI exposure, and automated acceptance coverage.

## Verdict

**CODE-COMPLETE FOR AUDITED SCOPE / RUNTIME DOWNLOAD ACCEPTANCE PENDING**

The export now has a server-enforced Administrator boundary, current-password re-authentication, server-side passphrase confirmation, genuine XLSX file encryption, normalized entity/relation/credential sheets, no server-side plaintext workbook file, post-encryption audit logging without contents/passphrase, explicit handling warnings, and a browser acceptance spec that downloads and decrypts the generated workbook.

## Acceptance trace

| Acceptance | Status | Evidence |
| --- | --- | --- |
| Admin-only UI/API | CODE PASS / BROWSER PENDING | `@Roles(Role.ADMIN)`; sidebar export item only renders for Admin; direct non-Admin page has no generation form; controller security tests and Playwright spec. |
| Current-password re-auth immediately before generation | CODE PASS | `verifyCurrentPassword` runs before `createWorkbook`; controller test proves call ordering boundary. |
| New passphrase supplied + confirmed and never stored/logged | CODE PASS | DTO contains passphrase + confirmation; server rejects mismatch; audit contains no passphrase; workbook test scans workbook/audit text. |
| Genuine encrypted XLSX | UNIT PASS / BROWSER PENDING | xlsx-populate encrypted output; service test proves no/wrong password rejection and correct password decryption. Browser spec repeats this against downloaded file. |
| Structured required sheets + archived records + credentials | UNIT PASS / BROWSER PENDING | normalized Export Metadata, Field Definitions, Applications, Environments, Components, Application Access, Assets, Asset Access Points, VMs, Database Instances, Logical Databases, Relationships, vCenter Sources, Credentials. Queries intentionally include archived records. |
| KB/Documents/attachments/JWT/keys/sessions/runtime secrets/passphrase excluded | UNIT PASS / BROWSER PENDING | export queries do not load KB/doc/attachment/session material; encrypted workbook unit test and browser spec scan excluded markers and seeded `Getting Started` document content. |
| Plaintext workbook not left on server | STATIC PASS | implementation uses in-memory XlsxPopulate workbook and encrypted buffer only; no filesystem/temp-file write path. |
| Explicit handling warning; no unencrypted export | STATIC PASS / BROWSER PENDING | UI explains plaintext passwords after workbook decrypt, passphrase separation, and offers encrypted XLSX action only. |
| Audit actor/action/timestamp without contents/passphrase | UNIT PASS | `EXPORT_DATA` audit is written after encrypted buffer generation; timestamp is AuditLog default; details contain only format/encryption/sheetCount/generatedAt. |
| Automated download/decrypt/validate journey | COMPILE PASS / RUNTIME PENDING | `frontend/e2e/sensitive-inventory-export-v1-acceptance.spec.ts` downloads workbook and repeats encryption/content assertions. |

## Verification

- Backend focused export tests: 4/4 pass across controller/service suites.
- Backend build: TSC 0 issues; 124 files compiled after export changes.
- Frontend export/sidebar lint + TypeScript: pass.
- Sensitive export Playwright compile/list gate: pass; Admin download/decrypt and Viewer restriction journeys discovered.

## Remaining environment gates

1. Apply current migrations and seed to an acceptance database.
2. Start the HTTPS acceptance stack through the supported deployment path.
3. Execute the sensitive export browser journey against the real seeded stack.
4. Verify the downloaded workbook in a second compatible office reader if available during final integration.
5. Execute Ticket 13 serialized full-story and restart persistence gates.
