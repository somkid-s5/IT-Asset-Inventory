# V1 Internal Infrastructure Inventory

## Problem Statement

The System Administrator team has spent a long time adjusting an internal inventory product without reaching a stable, production-ready conclusion. The existing branch contains useful Asset, VM, Database, Credential, Knowledge Base, authentication, audit, and data-quality functionality, but the product does not yet provide a structured answer to the team's most important operational question: where an Application runs in PROD, which infrastructure and Databases it uses, and how the team accesses and operates it.

Application identity is currently represented by free-text values distributed across records. Database host and logical-database concepts are combined. UI composition varies by page and has accumulated page-specific styling. This makes relationships difficult to trust, routine lookup slower than necessary, and further visual changes likely to continue without a finish line.

The team needs one coherent internal system that is easy to read, fast to search, safe enough for stored credentials, consistent on every page, deployable on one internal VM, and verifiable through complete user journeys.

## Solution

Deliver V1 as an Application-centric internal infrastructure inventory. An Application contains PROD, UAT, and TEST Environments; each Environment contains team-defined Components that relate to physical Assets, vCenter-discovered VMs, and Logical Databases. Application detail becomes the primary operational view for locating infrastructure, Database dependencies, access information, credentials, and canonical Documents.

Rebuild the frontend presentation and navigation under one frozen shadcn/Tailwind design system while preserving sound backend behavior. Use shared Dashboard, List, Detail, and Dialog templates; consistent semantic tokens; readable Light and Dark themes; English interface copy; and Desktop-first responsive behavior with strong Mobile lookup.

Allow incomplete but truthful inventory through `Needs Context`, preserve team-authored VM context across vCenter synchronization and deletion, use Archive rather than ordinary permanent deletion, provide a safe Global Search Command Palette, retain convenient direct anonymous Document links on the internal network, and provide an Administrator-only passphrase-encrypted Sensitive Inventory Export containing the detailed inventory and operational credentials.

## User Stories

1. As a System Administrator, I want to search for an Application by name, so that I can immediately locate its production footprint.
2. As a System Administrator, I want to see PROD, UAT, and TEST separately, so that I do not confuse infrastructure between environments.
3. As a System Administrator, I want PROD selected visibly by default, so that common data entry is quick without hiding the chosen environment.
4. As a System Administrator, I want an Application Environment divided into Components, so that I know which infrastructure performs Web, Application, Database, Batch, Load Balancer, or another team-defined role.
5. As a System Administrator, I want to relate multiple VMs or Assets to one Component, so that redundant or scaled infrastructure is represented correctly.
6. As a System Administrator, I want the normal infrastructure form to emphasize one Primary Application, so that project-dedicated systems remain simple to record.
7. As a System Administrator, I want shared infrastructure to support additional Application relationships, so that exceptional shared services do not require duplicate records.
8. As a System Administrator, I want Application ownership divided into Technical Owner and Business Unit, so that operational and organizational responsibility are unambiguous.
9. As a System Administrator, I want related infrastructure to display Application ownership without re-entering it, so that ownership values do not drift.
10. As a System Administrator, I want to record an optional record-specific responsible party, so that genuine operational exceptions remain visible.
11. As a System Administrator, I want to create Applications and Components manually, so that the inventory reflects team knowledge rather than unreliable inference.
12. As a System Administrator, I want the system to flag missing Application context without inventing it, so that incomplete knowledge remains honest.
13. As a System Administrator, I want to promote an unknown VM into Inventory, so that every discovered VM can be tracked before its purpose is known.
14. As a System Administrator, I want an unknown VM marked `Needs Context`, so that the team can complete it later.
15. As a System Administrator, I want physical Assets and Databases to support progressive completion, so that I can record existence before learning every operational detail.
16. As a System Administrator, I want Data Quality to list the exact missing context, so that I know how to complete a record.
17. As a System Administrator, I want a PROD Application considered complete only under one centralized rule, so that Dashboard and Data Quality agree.
18. As a System Administrator, I want to declare `No Database` intentionally, so that applications without a Database do not remain permanently incomplete.
19. As a System Administrator, I want vCenter to refresh discovered VM facts, so that power, capacity, guest OS, IP, and disk information stay current.
20. As a System Administrator, I want vCenter synchronization never to overwrite Curated Context, so that Application relationships, ownership, credentials, notes, and Documents are preserved.
21. As a System Administrator, I want a VM missing from vCenter marked `Deleted in vCenter`, so that removal is visible without destroying historical context.
22. As a System Administrator, I want to archive a deleted VM explicitly, so that active views remain clean while history remains available.
23. As a System Administrator, I want physical Asset Access Points to retain separate Host and Management layers, so that hardware access matches real operational interfaces.
24. As a System Administrator, I want each Asset Access Point to hold its IP, method, version, and accounts together, so that I know exactly how to reach it.
25. As a System Administrator, I want VM guest access stored against the VM, so that it is not confused with vCenter Source access.
26. As a System Administrator, I want Application Access stored against an Application Environment, so that production and administrative URLs are not attached to unrelated machines.
27. As a System Administrator, I want a Database Instance separated from its Logical Databases, so that I can count database services and identify the databases used by each Application.
28. As a System Administrator, I want a Database Instance related to its VM or physical host, so that the Database location is navigable.
29. As a System Administrator, I want a Database Account to be instance-wide or scoped to selected Logical Databases, so that credentials are not duplicated.
30. As a System Administrator, I want one credential change to cover all selected Database scopes, so that password maintenance is reliable.
31. As an Editor, I want to create and update operational records, so that I can maintain the team's inventory.
32. As an Editor, I want to reveal an authorized credential when needed, so that I can perform operational work.
33. As a Viewer, I want to read Inventory and Documents without seeing credential values, so that lookup access does not grant secret access.
34. As an Administrator, I want to manage users and protected lifecycle actions, so that privileged operations remain controlled.
35. As an Administrator, I want every credential reveal and copy audited, so that sensitive access is traceable.
36. As an Administrator, I want Audit Logs to omit passwords, tokens, and keys, so that logging cannot become a secret leak.
37. As an installer, I want to bootstrap exactly one initial Administrator, so that production does not ship default accounts or enable public registration.
38. As a user, I want Global Search available from every page and through `Ctrl+K`, so that I can locate records without first choosing a module.
39. As a user, I want Global Search grouped by record type, so that similarly named results remain understandable.
40. As a user, I want Global Search to find names, hostnames, IPs, asset IDs, serial numbers, Database names, and Document titles, so that I can search with the information available to me.
41. As a user, I want search results to exclude usernames, passwords, and secrets, so that routine lookup remains safe.
42. As a user, I want the Dashboard summary counts first, so that I see the current inventory before work queues.
43. As a user, I want Dashboard summary items to open the relevant filtered inventory, so that the overview leads directly to detail.
44. As a user, I want Needs Attention below the summary, so that incomplete Applications and vCenter problems are visible without dominating the page.
45. As a user, I want recently updated records on the Dashboard, so that I can resume current work quickly.
46. As a user, I want one canonical Document linked to several inventory records, so that procedures do not diverge into copies.
47. As a field technician, I want a known Document link to open read-only without Login, so that I can follow a procedure directly from LINE on the internal network.
48. As a signed-out visitor, I want the known shared Document to render its images, so that the procedure remains complete.
49. As a signed-out visitor, I must not browse or search the wider Knowledge Base, so that a direct link does not expose the document collection.
50. As an Administrator, I want to archive and restore Applications, Assets, VMs, and Databases, so that retirement does not destroy relationships or history.
51. As a user, I want archived records hidden from active lists and available through an explicit filter, so that normal views remain focused.
52. As an Administrator, I want to re-authenticate before creating a Sensitive Inventory Export, so that an unattended session cannot export every credential.
53. As an Administrator, I want to supply a new export passphrase, so that the generated XLSX is encrypted for controlled delivery.
54. As an Administrator, I want the workbook to include detailed Applications, Environments, Components, Access, Assets, VMs, Database Instances, Logical Databases, relationships, archived records, and operational credentials, so that it serves as complete inventory documentation.
55. As an Administrator, I want the workbook to exclude Knowledge Base content, attachments, JWT material, encryption keys, sessions, and deployment secrets, so that it contains only the agreed Inventory scope.
56. As an Administrator, I want the export audited without storing its passphrase or contents, so that the action is traceable without creating another secret copy.
57. As a user, I want every list page to share the same header, filters, table, pagination, and state patterns, so that I do not relearn each module.
58. As a user, I want every detail page to share the same hierarchy and action placement, so that related information is predictable.
59. As a user, I want concise create and edit flows in Dialogs and complex topology or Document editing on full pages, so that the interaction matches the task.
60. As a user, I want readable Light and Dark themes with remembered preference, so that extended use is comfortable.
61. As a user, I want English interface terminology used consistently, so that labels match infrastructure tools.
62. As a Tablet user, I want complete workflows to reflow without losing actions, so that I can maintain inventory away from a desktop.
63. As a Mobile user, I want optimized search, list, detail, and credential-reveal flows, so that field lookup is practical on a small screen.
64. As an operator, I want the complete stack to restart without losing inventory, so that normal VM or container restarts do not interrupt long-term use.
65. As an operator, I want HTTPS-only IP access with documented certificate acceptance, so that credentials are encrypted in transit on the internal network.

## Implementation Decisions

- V1 contains Applications, physical Assets, Virtual Machines and vCenter Sources, Database Instances and Logical Databases, Credentials, Documents, Users, Audit Logs, Data Quality, Global Search, and Sensitive Inventory Export.
- Ticketing, Clients, Notifications, SLA management, and Service as a separate domain entity are not part of V1.
- Application is the primary aggregate. It owns Environments and ownership. Environments own Components and Application Access.
- Component roles are team-managed strings rather than a globally fixed enum.
- Infrastructure-to-Component relationships support many-to-many storage while presenting one Primary Application in the common dedicated-project workflow.
- Environment is a controlled enum containing PROD, UAT, and TEST. PROD is the visible default and is never inferred from names.
- Physical Asset minimum identity is name plus type. Asset ID and serial number are optional unique identifiers when present.
- VM identity is the stable vCenter identity within a vCenter Source. Promotion does not require business context.
- Database Instance minimum identity is display name, engine, and host or related compute identity. Logical Database identity is its name within an Instance.
- Database Accounts belong to an Instance and use either instance-wide scope or a set of Logical Database relationships.
- Existing Asset Host and Management Access Point behavior is retained. The data relationship between an Access Point and its credentials must be explicit rather than reconstructed from duplicated display fields.
- Application, VM guest, Asset, and Database credentials remain separate resource-appropriate access records while sharing encryption, projection, reveal, and audit behavior.
- Credential secret values never appear in list, Global Search, ordinary detail, logs, errors, or normal exports.
- Applications, Assets, VMs, Database Instances, and Logical Databases use archive and restore instead of ordinary UI permanent deletion.
- vCenter synchronization uses explicit field ownership. Discovered Facts refresh; Curated Context never does.
- A VM missing from vCenter becomes `DELETED_IN_VCENTER` and remains available until explicitly archived.
- Data Quality is driven by centralized completeness evaluators shared by API responses, Dashboard, and Data Quality views.
- A Complete PROD Application requires name, description, Technical Owner, Business Unit, PROD Environment, at least one Component, related compute, and either a related Logical Database or No Database declaration.
- Global Search uses one permission-safe grouped search contract and the existing shadcn Command primitive. No separate search-results route is introduced.
- Knowledge Base Documents remain canonical and relate many-to-many to Applications, Assets, VMs, and Database Instances.
- A known Direct Document Link remains anonymous and read-only. Anonymous collection listing, category browsing, recent listing, and search are removed.
- The Controlled UI Rebuild freezes semantic tokens and shared Dashboard, List, Detail, and Dialog templates before migrating feature pages.
- Application topology and Document editing are approved full-page exceptions; ordinary concise create and edit flows use Dialogs.
- Light and Dark share semantic tokens. Light is default and explicit preference persists. Cyber, glass, and page-specific visual systems are removed.
- Interface Copy is English. User-authored values and Documents may be Thai or English.
- Responsive scope is Desktop-first, complete on Tablet, and optimized for lookup and safe credential reveal on Mobile.
- The first Administrator is created by explicit one-time bootstrap. Self-registration and production default accounts are removed.
- Viewer, Editor, and Administrator capabilities follow ADR 0013. Audit Logs are Administrator-only and non-editable.
- Sensitive Inventory Export is one Administrator-only, re-authenticated, genuinely passphrase-encrypted XLSX. No unencrypted secret export is available, and plaintext workbook data is not persisted on the server.
- Current test data can be reset. A clean migration chain and explicit, repeatable development seed replace legacy test-data compatibility work.
- Production is one Docker Compose stack on one internal VM, accessed by internal IP through HTTPS with an internal or self-signed certificate. HTTP redirects to HTTPS and authentication cookies are Secure.
- Application-managed Backup, Restore, NetBackup configuration, DNS, Kubernetes, and external managed services are outside the project.
- Existing sound API behavior is preserved unless it conflicts with an accepted ADR. Legacy UI is removed as each route is migrated rather than wrapped indefinitely.
- Dependency modernization is controlled by supported runtime compatibility, lockfiles, vulnerability evidence, and complete regression verification; automatic force-fix upgrades are not accepted.

## Testing Decisions

- The primary and highest test seam is the complete browser journey against the real frontend, backend, and isolated PostgreSQL database. Existing Playwright conventions and role-specific authentication setup are preferred.
- Tests assert external behavior through accessible roles, labels, URLs, visible state, downloaded artifacts, API outcomes, and persisted data. They do not assert component internals, CSS implementation details, or private method calls.
- One isolated Compose-backed acceptance environment is the release oracle. Each run starts from a known database state, records raw exit status, and leaves deterministic evidence.
- Core journeys cover initial Administrator bootstrap; Login and forced password change; Application creation and topology; unknown VM promotion; vCenter refresh and deletion preservation; Asset Host and Management access; Database Instance and Logical Database relationships; credential reveal permissions and audit; Global Search; Data Quality; canonical Document linking and anonymous direct link; archive and restore; and Sensitive Inventory Export.
- The Sensitive Inventory Export journey downloads the workbook, proves that opening without the passphrase fails, decrypts it with the supplied test passphrase, validates the expected sheets and relationships, and proves that deployment secrets are absent.
- vCenter synchronization uses a controlled adapter boundary for deterministic integration tests plus a staging connection test against an approved real endpoint. Tests explicitly assert Discovered Fact refresh and Curated Context preservation.
- Backend integration tests cover authorization and permission-safe response projection at the HTTP boundary, not only service mocks.
- Focused unit tests remain appropriate for pure completeness evaluation, archive-state transitions, export row construction, filename or upload validation, and secret sanitization.
- Shared UI templates receive representative browser coverage in Light and Dark at Desktop, Tablet, and Mobile sizes; feature pages rely on those templates rather than duplicating structural tests.
- Accessibility checks cover keyboard navigation, focus order, names, contrast, Dialog behavior, Command Palette behavior, and responsive action availability.
- Persistence verification restarts the Compose services without deleting volumes and proves that created Applications, relationships, Documents, users, and encrypted credentials remain usable.
- Build, lint, unit, integration, Playwright, fresh migration, and restart-persistence checks all must pass before V1 is considered complete.

## Out of Scope

- Ticketing, Clients, Notifications, incidents, requests, and SLA workflows
- A separate Service entity or service catalog
- Automatic Application or Component discovery
- Environments other than PROD, UAT, and TEST in V1
- Public internet exposure or publicly trusted DNS-based hosting
- Kubernetes, high-availability clustering, or external managed services
- Application-managed Backup and Restore, NetBackup configuration, or restore testing
- CSV Import, CSV Export, Bulk Update, or any workbook re-import flow
- Knowledge Base content or attachments in the Sensitive Inventory Export
- Self-registration or production default accounts
- Permanent deletion through ordinary product UI
- A separate Global Search results page
- A complete Mobile bulk-authoring experience equivalent to Desktop
- Internationalization infrastructure for V1
- Decorative cyber, glass, or page-specific visual themes
- Unencrypted export of stored credentials

## Further Notes

- The accepted ADRs and Product Glossary are normative. If this spec and an accepted ADR conflict, the later explicit user decision must be documented before implementation.
- The current branch already removes Ticketing from the product surface, contains Data Quality and extensive Playwright coverage, and retains the useful Asset Access Point workflow. Those are foundations, not proof that the redesigned V1 journeys are complete.
- Baseline verification on 2026-09-04: backend build passed; 42 backend tests passed; frontend lint and production build passed. Backend lint reported five existing errors in an Asset pagination test and must be green before feature delivery begins.
- The current dependency audit reports unresolved advisories. Remediation must be verified rather than applied through an unreviewed force update.
- The current working database is test-only and may be reset under ADR 0021.
