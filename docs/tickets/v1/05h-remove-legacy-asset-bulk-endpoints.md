## Parent
Ticket 05 — Connect Hardware Assets to Application topology

## Goal
Retire legacy Asset bulk import/update API behavior after the V1 UI removed those actions and Sensitive Inventory Export became the approved bulk documentation path.

## Evidence
- No frontend Asset surface calls `/assets/bulk-import` or `/assets/bulk-update`.
- `AssetsController` still exposes both routes and `AssetsService` still carries the legacy implementations/DTOs.
- Parent Ticket 05 explicitly removes existing Import and Bulk Update actions.

## Required behavior
- Remove the Asset bulk-import and bulk-update controller routes.
- Remove their service methods and now-unused DTO types/files.
- Do not remove or alter the encrypted Sensitive Inventory Export feature.
- Ordinary single-record create/edit/archive/restore and Data Quality flows remain unchanged.
- Build/tests prove no internal code depends on the retired endpoints.

## Acceptance evidence
- repository search finds no `/assets/bulk-import` or `/assets/bulk-update` production references;
- backend lint/build green;
- Asset focused tests remain green.
