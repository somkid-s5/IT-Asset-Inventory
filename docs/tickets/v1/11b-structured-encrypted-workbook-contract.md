# 11b — Structured Encrypted Workbook Contract

## Goal

Generate a genuinely encrypted hand-off workbook that preserves Inventory entities, topology, archived history, account scope, access-point relationships, usernames, and operational passwords without exporting Knowledge Base/session/runtime secrets.

## Contract

Normalized sheets include Export Metadata, Field Definitions, Applications, Environments, Components, Application Access, Assets, Asset Access Points, Virtual Machines, Database Instances, Logical Databases, Relationships, vCenter Sources, and Credentials.

The workbook is encrypted at the XLSX file layer via xlsx-populate password encryption. Plaintext workbook data remains in memory only and is never written to a server-side temp file.

## Evidence

Focused service test proves no/wrong passphrase rejection, correct-passphrase decryption, credential/relationship presence, excluded-content absence, and safe audit details.
