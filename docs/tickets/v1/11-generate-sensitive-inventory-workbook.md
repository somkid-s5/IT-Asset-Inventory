## Parent

#4 — Spec: V1 internal infrastructure inventory

## What to build

Deliver the Administrator-only Sensitive Inventory Export: a detailed, genuinely encrypted XLSX snapshot of Inventory, relationships, archived records, and operational credentials for controlled delivery to another team.

## Acceptance criteria

- [ ] Only an Administrator can see or invoke Sensitive Inventory Export through UI and API.
- [ ] The Administrator must re-authenticate with the current account password immediately before generation.
- [ ] The Administrator supplies and confirms a new export passphrase that is never stored or logged.
- [ ] The generated `.xlsx` uses real file encryption and cannot be opened without the passphrase; worksheet protection alone does not satisfy this criterion.
- [ ] Structured sheets contain Applications, Environments, Components, Application Access, Assets and Access Points, VMs, Database Instances, Logical Databases, relationships, archived records, export metadata, field definitions, usernames, and stored operational passwords.
- [ ] Knowledge Base content, Document metadata, attachments, JWT material, credential-encryption keys, sessions, runtime secrets, and export passphrase are absent.
- [ ] Plaintext workbook data is streamed or held transiently and is not left in server storage after success or failure.
- [ ] The UI gives an explicit handling warning and never offers an unencrypted secret export.
- [ ] The Audit Log records actor, export action, and timestamp without contents or passphrase.
- [ ] An automated journey downloads the workbook, proves wrong/no passphrase rejection, decrypts with the test passphrase, validates relationships and credentials, and proves excluded secrets are absent.

## Blocked by

- #7 — V1-03: Complete authentication, users, and audit journeys.
- #8 — V1-04: Deliver Application topology and access.
- #9 — V1-05: Connect Hardware Assets to Application topology.
- #10 — V1-06: Complete the vCenter and VM Inventory lifecycle.
- #11 — V1-07: Model Database Instances and Logical Databases.

