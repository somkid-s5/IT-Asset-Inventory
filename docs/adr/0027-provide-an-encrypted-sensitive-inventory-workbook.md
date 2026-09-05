# ADR 0027: Provide an Encrypted Sensitive Inventory Workbook

- Status: Accepted
- Date: 2026-09-04

## Context

The team needs a detailed Excel snapshot that represents the inventory as structured documentation and includes the stored operational credentials. This is more sensitive than an ordinary filtered-list export.

## Decision

V1 provides one detailed Sensitive Inventory Export as a genuinely encrypted `.xlsx` workbook.

The workbook contains structured sheets for Inventory records and their relationships, including Applications, Environments, Components, Application Access, physical Assets and Access Points, VMs, Databases, archived records, export metadata, and inventory field definitions.

Knowledge Base Documents, document metadata, and file attachments are not included in the workbook.

Stored Hardware, VM, Database, and Application credentials, including their secret values, are included. Deployment secrets such as JWT signing material, the credential-encryption key, session tokens, and runtime configuration secrets are never included.

The export is subject to all of these controls:

- only an Administrator can initiate it;
- the Administrator must re-authenticate with their current password;
- the Administrator supplies a new export passphrase for each workbook;
- the workbook uses real file encryption, not worksheet or structure protection;
- an unencrypted export containing secret values is not available;
- the export action is audited without recording the export passphrase or exported secrets;
- the UI displays an explicit handling warning before generation.

Import and Bulk Update are not part of V1. The workbook is a documentation snapshot, not a supported restore format.

## Consequences

- Export tests must prove role restriction, re-authentication, workbook encryption, expected sheet contents, and absence of deployment secrets.
- Generated workbook data must avoid temporary plaintext persistence on the server.
- The receiving team assumes responsibility for the decrypted workbook after opening it.
- Existing CSV Import, CSV Export, and Bulk Update workflows are superseded for V1.
