# 07e — Database Legacy linkedApps + List Contract

## Goal
Remove competing topology semantics and keep Database list payload intentional.

## Requirements
- Classify `linkedApps` as legacy operational connection metadata or retire it from primary topology UX; it must not be presented as the canonical Application relationship.
- Canonical Application relationship is Logical Database ↔ Application Component.
- Database Detail labels legacy connection IPs clearly if retained.
- Database list returns only fields needed by list/search/filter/status/counts; detail-only Documents and deep topology should not be loaded per row unless the UI uses them.
- Search/filter/pagination behavior must remain usable at production inventory sizes.

## Acceptance
- UI never suggests `linkedApps` IP strings are the Application topology source of truth.
- List query has an explicit lightweight projection or justified includes.
- Detail endpoint remains the source for deep relationships and Documents.
