# 06f — Progressive VM Promotion + Data Quality

## Problem found by audit
The backend can create an Inventory VM with `NEEDS_CONTEXT`, but the Discovery Detail UI blocks promotion unless discovery completeness is 100%. In addition, Inventory Data Quality does not report a missing Application Component relationship, so a VM promoted without Application context can incorrectly look complete.

## Required behavior
- ADMIN/EDITOR can promote an incomplete/unknown Discovery into Inventory without being blocked by the UI.
- Promotion never invents missing curated context.
- Inventory `discoveryState` is `NEEDS_CONTEXT` when required curated fields are missing OR there is no Application Component relationship.
- VM Data Quality explicitly reports `application component` when no component relationship exists.
- Adding Primary/Shared Application context later clears that issue through the normal Inventory edit flow.
- Viewer sees Discovery details read-only; ADMIN/EDITOR may curate/promote; discovery Archive remains ADMIN-only.

## Acceptance tests
- Promote a Discovery with no Application relationship: succeeds and Inventory is `NEEDS_CONTEXT`.
- Data Quality lists `application component` for the promoted VM.
- Add a Primary Application Component and refresh: the application-component issue disappears.
- Incomplete Discovery promotion is not blocked by a frontend completeness guard.
