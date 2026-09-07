## Parent

Ticket 05 — Connect Hardware Assets to Application topology

## Goal

Close the dead-end between Asset Data Quality and the Asset edit/detail workflow. A user must be able to inspect and maintain the operational governance context that the backend already stores and evaluates.

## Vertical slice

Schema -> API contract -> Dialog edit/create -> Detail -> Data Quality -> E2E.

No visual-system rewrite. Preserve current Asset Access Point and credential behavior.

## Required behavior

- Render editable Asset governance fields that already exist in persistence/API and are operationally justified:
  - owner
  - department
  - responsibleParty
  - vendor
- Do not add fields merely because they exist in Prisma; each rendered field needs a label/purpose consistent with the V1 domain model.
- Asset detail shows the populated governance context with an honest empty state for missing values.
- Data Quality `owner` issue can be resolved through the normal Asset edit journey.
- Viewer remains read-only; Editor/Admin can edit according to existing Asset permissions.
- Validation and API errors are visible and do not silently close the dialog.
- Preserve partial/progressive Asset creation; governance fields remain optional unless the centralized completeness rule explicitly requires them.

## Acceptance evidence

- Backend focused tests confirm DTO/update persistence for the governance fields and no regression to Asset detail/list projections.
- Playwright journey:
  1. open an Asset flagged for missing owner;
  2. edit governance context;
  3. save;
  4. detail displays the values;
  5. Data Quality no longer reports missing owner after refresh.
- Existing Asset CRUD/detail/access tests remain green.

## Out of scope

- Environment vocabulary changes.
- MA/lifecycle status redesign.
- Typed Asset-to-Asset topology.
- Global visual redesign.

## Blocked by

None beyond the existing Ticket 05 prerequisites.