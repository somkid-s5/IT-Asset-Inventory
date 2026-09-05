# ADR 0032: Separate Database Instances and Logical Databases

- Status: Accepted
- Date: 2026-09-04

## Context

A database server or service instance can host multiple logical databases. The current single Database Inventory record mixes host/service facts with the database name and cannot answer both infrastructure-capacity and Application-dependency questions precisely.

## Decision

V1 separates the domain into two levels:

- Database Instance records the engine, version, host or related compute, IP address, port, service or instance name, status, access, and operational notes.
- Logical Database records a named database hosted by one Database Instance and relates it to the Application Components that use it.

One Database Instance can host many Logical Databases. A Logical Database belongs to one Database Instance.

## Consequences

- The product can count and locate database services separately from hosted databases.
- Application topology links to the Logical Database while retaining navigation to its hosting Database Instance.
- Existing Database Inventory UI and schema require replacement rather than relabeling.
- The detailed Inventory Workbook includes separate Database Instances and Logical Databases sheets with stable relationship identifiers.

