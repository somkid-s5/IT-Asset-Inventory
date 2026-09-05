# V1 Domain Model

This document summarizes the accepted V1 domain model. The decision history and rationale remain in `docs/adr/`.

## Relationship map

```text
Application
  ├─ Environment (PROD | UAT | TEST)
  │    ├─ Component (team-defined role)
  │    │    ├─ Physical Asset [0..many]
  │    │    ├─ VM Inventory [0..many]
  │    │    └─ Logical Database [0..many]
  │    ├─ Application Access [0..many]
  │    │    └─ Credential [0..many]
  │    └─ No Database declaration [0..1]
  └─ Document [0..many, canonical links]

Physical Asset
  ├─ Access Point [0..many]
  │    └─ Credential [0..many]
  ├─ Document [0..many, canonical links]
  └─ Application Component [0..many; one primary in the normal case]

vCenter Source
  └─ VM Discovery [0..many]
       └─ VM Inventory [0..1]
            ├─ Guest Access / Credential [0..many]
            ├─ Document [0..many, canonical links]
            └─ Application Component [0..many; optional while unknown]

Database Instance
  ├─ Logical Database [0..many]
  ├─ Database Account [0..many]
  │    └─ Scope (instance-wide or selected Logical Databases)
  ├─ Document [0..many, canonical links]
  └─ related VM or Physical Asset [0..1]

Knowledge Base Document
  └─ links to Applications, Physical Assets, VMs, and Database Instances [0..many]
```

## Identity and progressive completion

Records can be captured before all business context is known. Minimum identity is intentionally small:

- Application: unique name.
- Physical Asset: name and type; asset ID and serial number remain optional unique identifiers when present.
- VM Discovery and Inventory: vCenter Source plus the stable vCenter VM identity.
- Database Instance: display name, engine, and host or related compute identity.
- Logical Database: name within one Database Instance.
- Document: title and category.

Missing context produces `Needs Context`; the product never invents values.

## Environment and ownership

- Operational environments are PROD, UAT, and TEST.
- PROD is the visible default for new VM, Application Environment, and Database records.
- Application owns Technical Owner and Business Unit.
- Related infrastructure displays Application ownership without requiring duplicate values.
- A record-specific responsible party remains optional for genuine exceptions.

## VM field ownership and lifecycle

vCenter owns discovered identity, VM name, power state, CPU, memory, guest OS, IP addresses, and disks. The team owns Application and Component relationships, Environment, ownership context, Criticality, credentials, notes, and Documents. Sync never overwrites team-owned context.

When an inventoried VM disappears from vCenter it becomes `DELETED_IN_VCENTER`; it is not deleted. A user can archive it explicitly later.

## Lifecycle

Applications, Physical Assets, VMs, Database Instances, and Logical Databases use an archive-first lifecycle. Archived records are hidden from active lists, available through an explicit filter, restorable by an Administrator, and retained with their relationships and history.

## Completeness

A PROD Application is complete when it has a name, description, Technical Owner, Business Unit, PROD Environment, at least one Component, related compute infrastructure, and either a related Logical Database or an explicit No Database declaration.

VMs, Assets, and Databases may remain valid in `Needs Context` until their ownership and Application context are known.

## Access and credentials

- Physical Asset Access Points retain the existing Host and Management separation.
- VM guest, Database, and Application Environment access are modeled against the resource they actually access.
- Database Accounts belong to an Instance and can be instance-wide or scoped to selected Logical Databases.
- Credential list and ordinary detail responses never contain secret values.
- Editor and Administrator roles can reveal credentials; every reveal or copy is audited.

## Documents

Knowledge Base Documents are canonical records that can link to multiple inventory records. A known direct Document link opens read-only without Login on the internal network. Anonymous users cannot enumerate or search the wider Knowledge Base.

## Roles

- Viewer: read Inventory and Documents; cannot reveal credentials.
- Editor: maintain operational records and reveal credentials; cannot manage users or perform protected destructive actions.
- Administrator: full access, user management, archive and restore, Audit Logs, and Sensitive Inventory Export.

Production uses a one-time Administrator bootstrap, with no self-registration or production default accounts.

## Sensitive Inventory Export

An Administrator can re-authenticate and generate a passphrase-encrypted XLSX containing detailed Inventory relationships and stored operational credentials. It excludes Knowledge Base content, attachments, and deployment secrets. Import and Bulk Update are out of scope.

