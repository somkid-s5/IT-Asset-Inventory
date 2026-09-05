# ADR 0024: Delegate Backup to NetBackup

- Status: Accepted
- Date: 2026-09-04

## Context

The organization already uses NetBackup to protect the complete Deployment VM. Adding application-managed database and attachment backup would duplicate established infrastructure operations.

## Decision

NetBackup is the backup owner for V1 and protects the complete Deployment VM.

The product will not implement scheduled backup jobs, backup retention, network-share upload, a backup-status feature, or backup and restore verification. Backup and recovery procedures are managed by the user outside this project.

## Consequences

- Application-managed backup is out of scope.
- NetBackup policy and retention remain external operational responsibilities.
- The V1 spec, tickets, and release gates do not include NetBackup configuration or restore testing.
