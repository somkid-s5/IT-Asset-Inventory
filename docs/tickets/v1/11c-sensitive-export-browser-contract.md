# 11c — Sensitive Export Browser Contract

## Goal

Prove the full Administrator download path and non-Administrator restriction with deterministic browser automation.

## Browser matrix

- Admin opens Sensitive Inventory Export and sees the handling warning.
- Admin re-authenticates, supplies + confirms a new workbook passphrase, and downloads XLSX.
- Downloaded file rejects no passphrase and wrong passphrase.
- Correct passphrase decrypts the workbook.
- Workbook contains required structured sheets, stored operational passwords, and relationship rows.
- Seeded Knowledge Document content, JWT/key markers, and export passphrase are absent.
- Viewer has no sidebar export link and no direct generation controls.

## Evidence

`frontend/e2e/sensitive-inventory-export-v1-acceptance.spec.ts` passes Playwright compile/list gate; runtime execution is deferred to the acceptance stack.
