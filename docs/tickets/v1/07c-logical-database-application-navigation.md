# 07c — Logical Database ↔ Application Navigation

## Goal
Make the existing Logical Database/Application Component relationship visible and actionable in both directions.

## Requirements
- Database Detail must show each Logical Database with linked Application / Environment / Component identities, not only a count.
- Relationship cards/rows navigate to the Application Detail.
- Application Detail must expose linked Logical Databases with Database Instance identity and navigate back to Database Detail.
- Logical Database CRUD must be first-class on Database Detail for ADMIN/EDITOR, not only a comma-separated Instance form field.
- Logical Database names remain unique within an Instance.
- Component IDs are deduplicated and validated.
- Removing/renaming a Logical Database must not silently destroy account scope or Application links; block destructive removal while referenced unless the user explicitly resolves dependencies.

## Acceptance
- One Instance can contain several Logical Databases.
- Each Logical Database can link to one or more Application Components.
- User can navigate Database -> Logical DB relation -> Application and Application -> Logical DB -> Database.
- Duplicate Logical Database name in one Instance is rejected.
- Referenced Logical Database cannot disappear because a comma-separated field was edited.
