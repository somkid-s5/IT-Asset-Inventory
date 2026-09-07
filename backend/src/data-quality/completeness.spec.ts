import { VmDiscoveryState, VmLifecycleState } from '@prisma/client';
import {
  evaluateApplicationCompleteness,
  evaluateAssetCompleteness,
  evaluateDatabaseCompleteness,
  evaluateVmDiscoveryCompleteness,
  evaluateVmInventoryCompleteness,
} from './completeness';

describe('central completeness evaluators', () => {
  it('treats an explicit PROD No Database decision as a valid Application resolution', () => {
    const evaluation = evaluateApplicationCompleteness({
      name: 'Treasury Registry',
      description: 'Registry workload',
      technicalOwner: 'app-team',
      businessUnit: 'Treasury',
      environments: [
        {
          name: 'PROD',
          noDatabase: true,
          components: [{ assetCount: 1, vmCount: 0, logicalDatabaseCount: 0 }],
        },
      ],
    });

    expect(evaluation.complete).toBe(true);
    expect(evaluation.needsContext).toBe(false);
    expect(evaluation.missingFields).toEqual([]);
  });

  it('keeps expired Asset warranty operational rather than counting it as missing context', () => {
    const evaluation = evaluateAssetCompleteness({
      owner: 'infra-team',
      location: 'Bangkok DC1',
      serialNumber: 'SN-001',
      ipCount: 1,
      warrantyExpiration: new Date('2025-01-01T00:00:00Z'),
      now: new Date('2026-09-06T00:00:00Z'),
    });

    expect(evaluation.complete).toBe(true);
    expect(evaluation.missingFields).toEqual([]);
    expect(evaluation.operationalReasons.map((reason) => reason.code)).toEqual([
      'asset.warrantyExpired',
    ]);
  });

  it('keeps Deleted in vCenter operational while preserving VM context completeness', () => {
    const evaluation = evaluateVmInventoryCompleteness({
      owner: 'vm-team',
      businessUnit: 'Treasury',
      serviceRole: 'Application Server',
      criticality: 'BUSINESS_CRITICAL',
      componentCount: 1,
      lifecycleState: VmLifecycleState.DELETED_IN_VCENTER,
      syncState: 'Missing from source',
    });

    expect(evaluation.complete).toBe(true);
    expect(evaluation.missingFields).toEqual([]);
    expect(evaluation.operationalReasons.map((reason) => reason.code)).toEqual([
      'vm.deletedInVcenter',
    ]);
  });

  it('uses one Database reason set for host identity and operational context', () => {
    const evaluation = evaluateDatabaseCompleteness({
      host: null,
      hostAssetId: null,
      hostVmId: null,
      ipAddress: null,
      owner: null,
      environment: null,
      backupPolicy: null,
      accountCount: 0,
    });

    expect(evaluation.missingFields).toEqual([
      'host identity',
      'IP address',
      'owner',
      'environment',
      'backup policy',
      'database account',
    ]);
  });

  it('derives VM Discovery state from exact centralized reasons', () => {
    const evaluation = evaluateVmDiscoveryCompleteness({
      systemName: null,
      environment: null,
      serviceRole: null,
      description: null,
      guestAccountsCount: 0,
    });

    expect(evaluation.state).toBe(VmDiscoveryState.NEEDS_CONTEXT);
    expect(evaluation.missingFields).toEqual([
      'System Name',
      'Environment',
      'Service Role',
      'Service Purpose',
      'Guest Accounts',
    ]);
  });
});
