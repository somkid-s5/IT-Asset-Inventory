# Product Glossary

This glossary defines the accepted shared language for the V1 internal infrastructure inventory.

## Accepted terms

### Asset

A physical infrastructure item managed by the System Administrator team, such as a server, storage device, switch, service processor, or network appliance.

### Virtual Machine (VM)

A machine discovered from vCenter. vCenter-owned facts may be refreshed by synchronization, while team-authored operational context must remain available if the VM later disappears from vCenter.

### vCenter Source

A configured vCenter connection used to discover and synchronize VM facts.

### Database

A general product area consisting of Database Instances and their Logical Databases.

### Database Instance

A running database engine or service with host, network, version, service-name, access, status, and operational details. One Database Instance can host multiple Logical Databases.

### Logical Database

A named database hosted by one Database Instance and used by one or more Application Components.

### Database Account Scope

The access boundary of one Database Account: either its complete Database Instance or one or more selected Logical Databases on that Instance.

### Document

Canonical operational knowledge maintained in the Knowledge Base, such as procedures, configuration notes, and troubleshooting guidance. One Document can be linked to multiple Applications and infrastructure records without duplicating its content.

### Credential

Authentication information used to access an infrastructure endpoint. Credential values are sensitive even when the system is available only on the internal network.

### Access Layer

The operational surface being accessed. At minimum, the domain must distinguish a hardware management layer from the primary host or operating-system layer.

### Application

A named system that the team operates or supports, such as ERP. It is the primary entry point for locating the system's environments, infrastructure, databases, credentials, access URLs, and operational documents.

### Environment

An operational context of an Application, VM, or Database. The standard values are PROD, UAT, and TEST. PROD is the visible default for new records. Each Application Environment has its own relationships to infrastructure, databases, credentials, access URLs, and documents.

### Component

A team-defined operational role within an Application Environment, such as Load Balancer, Web, Application, Database, or Batch. A Component can use one or more VMs, physical Assets, or Databases.

### Technical Owner

The IT person or team responsible for operating an Application. This is the authoritative Application-level ownership field.

### Business Unit

The organization that owns or uses an Application.

### Primary Application

The main Application served by an infrastructure record in the normal project-dedicated case. An infrastructure record may be related to additional Applications when it is genuinely shared.

### Deleted in vCenter

A VM lifecycle state indicating that a previously inventoried VM is no longer returned by its vCenter source. The Inventory record and all team-authored context are preserved.

### Archived VM

A preserved VM Inventory record that a user has explicitly removed from normal active workflows without deleting its history.

### Archived Record

An Application, VM, physical Asset, or Database removed from default active views while retaining its relationships and history. An Administrator can restore it.

### Global Search

A Topbar Command Palette that searches permission-safe identifying information across Applications, VMs, physical Assets, Databases, and Documents and navigates directly to the selected record.

### Needs Attention

Dashboard records requiring team action, such as incomplete inventory context, a failed vCenter sync, a VM deleted in vCenter, or an incomplete PROD Application relationship.

### Controlled UI Rebuild

A replacement of frontend presentation and navigation under one frozen design system while preserving sound backend contracts, data, authentication, and business behavior.

### Interface Copy

Product-controlled text such as navigation, labels, actions, status names, validation, and feedback. V1 Interface Copy is consistently English; team-authored content may be Thai or English.

### Semantic Design Token

A shared theme-aware value named by purpose, such as background, foreground, muted, border, warning, or destructive. Pages use these tokens instead of raw colors.

### Mobile Lookup

The narrow-screen workflow optimized for Global Search, inventory lists, detail reading, and permission-gated credential reveal rather than complex bulk authoring.

### Clean V1 Database

A database created deterministically from the final V1 migrations without carrying forward current test records or obsolete schema concepts.

### Deployment VM

The single internal virtual machine hosting the V1 Docker Compose stack and reached by the team through its internal IP address.

### Internal Certificate

A certificate used to provide HTTPS on the Deployment VM's internal IP. It may require an explicit trust or browser-acceptance step on team devices.


### Discovered Fact

A technical VM value owned and refreshed by vCenter, such as power state, CPU, memory, guest OS, IP address, or disk information.

### Curated Context

Operational information maintained by the team, such as Application relationships, ownership, criticality, credentials, notes, and documents. Synchronization must not overwrite it.

### Manual Curation

The team explicitly creates Applications, Environments, Components, and their relationships. The system may flag missing context but does not infer or assign it automatically.

### Application Access

An access point belonging directly to an Application Environment, such as a production URL or administrator console, with its access method and permission-gated encrypted credentials.

### Viewer

A user who can read Inventory and Documents but cannot reveal credential values.

### Editor

A user who can maintain operational records and reveal credentials but cannot manage users or perform protected destructive actions.

### Administrator

A user with full operational access, including user management and protected delete or archive actions.

### Administrator Bootstrap

The explicit one-time production setup step that creates the first Administrator without enabling self-registration or shipping a default account.

### Audit Log

An Administrator-only, non-editable record of authentication, inventory changes, archive or restore, synchronization, export, and credential access. It never contains secret values.

### Sensitive Inventory Export

An Administrator-only, re-authenticated, passphrase-encrypted Excel workbook containing the detailed inventory, relationships, and stored operational credentials. It excludes deployment secrets and is documentation rather than a supported restore format.

### Direct Document Link

A non-authenticated, read-only URL for one known Knowledge Base Document on the internal network. Possessing the link does not grant browsing or search access to the wider Knowledge Base.

### Complete PROD Application

A PROD Application with a name, description, Technical Owner, Business Unit, PROD Environment, at least one Component, related compute infrastructure, and either a related Database or an explicit No Database declaration.

### No Database

An explicit Application Environment declaration that no Database is required. It resolves the Database completeness requirement without creating placeholder inventory.

### Needs Context

A data-quality state for an Inventory record that is valid to retain but lacks business information the team has not yet identified. It is reviewable and never filled by guessing.

### V1

The first production-ready scope: Applications, physical Assets, Virtual Machines and vCenter sources, Database Instances and Logical Databases, Credentials, Documents, Users, Audit Logs, Data Quality, Global Search, and Sensitive Inventory Export.
