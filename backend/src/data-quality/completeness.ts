import { VmDiscoveryState, VmLifecycleState } from '@prisma/client';

export type QualityReasonCategory = 'context' | 'operational';

export type QualityReason = {
  code: string;
  label: string;
  guidance: string;
  category: QualityReasonCategory;
};

export type CompletenessEvaluation = {
  complete: boolean;
  needsContext: boolean;
  completeness: number;
  missingFields: string[];
  reasons: QualityReason[];
  operationalReasons: QualityReason[];
};

function contextReason(
  code: string,
  label: string,
  guidance: string,
): QualityReason {
  return { code, label, guidance, category: 'context' };
}

function operationalReason(
  code: string,
  label: string,
  guidance: string,
): QualityReason {
  return { code, label, guidance, category: 'operational' };
}

function finalize(
  requiredCount: number,
  reasons: QualityReason[],
  operationalReasons: QualityReason[] = [],
): CompletenessEvaluation {
  const missingFields = reasons.map((reason) => reason.label);
  return {
    complete: reasons.length === 0,
    needsContext: reasons.length > 0,
    completeness: Math.max(
      0,
      Math.round(((requiredCount - reasons.length) / requiredCount) * 100),
    ),
    missingFields,
    reasons,
    operationalReasons,
  };
}

export type ApplicationCompletenessInput = {
  name: string;
  description?: string | null;
  technicalOwner?: string | null;
  businessUnit?: string | null;
  environments: Array<{
    name: string;
    noDatabase: boolean;
    components: Array<{
      assetCount: number;
      vmCount: number;
      logicalDatabaseCount: number;
    }>;
  }>;
};

export function evaluateApplicationCompleteness(
  input: ApplicationCompletenessInput,
): CompletenessEvaluation {
  const prod = input.environments.find(
    (environment) => environment.name === 'PROD',
  );
  const prodComponents = prod?.components ?? [];
  const reasons: QualityReason[] = [];

  if (!input.name.trim()) {
    reasons.push(
      contextReason('application.name', 'name', 'Add an Application name.'),
    );
  }
  if (!input.description?.trim()) {
    reasons.push(
      contextReason(
        'application.description',
        'description',
        'Describe what the Application is used for.',
      ),
    );
  }
  if (!input.technicalOwner?.trim()) {
    reasons.push(
      contextReason(
        'application.technicalOwner',
        'technical owner',
        'Assign the team or person responsible for the Application technically.',
      ),
    );
  }
  if (!input.businessUnit?.trim()) {
    reasons.push(
      contextReason(
        'application.businessUnit',
        'business unit',
        'Record the business unit that owns or uses the Application.',
      ),
    );
  }
  if (!prod) {
    reasons.push(
      contextReason(
        'application.prodEnvironment',
        'PROD environment',
        'Add the PROD Environment for this Application.',
      ),
    );
  }
  if (prod && prodComponents.length === 0) {
    reasons.push(
      contextReason(
        'application.prodComponent',
        'PROD component',
        'Add at least one Component to the PROD Environment.',
      ),
    );
  }
  if (
    prod &&
    prodComponents.length > 0 &&
    prodComponents.every(
      (component) => component.assetCount + component.vmCount === 0,
    )
  ) {
    reasons.push(
      contextReason(
        'application.prodCompute',
        'PROD related compute',
        'Link at least one physical Asset or VM to a PROD Component.',
      ),
    );
  }
  if (
    prod &&
    !prod.noDatabase &&
    prodComponents.length > 0 &&
    prodComponents.every((component) => component.logicalDatabaseCount === 0)
  ) {
    reasons.push(
      contextReason(
        'application.prodDatabase',
        'PROD logical database or No Database declaration',
        'Link a Logical Database to PROD or explicitly declare No Database.',
      ),
    );
  }

  return finalize(8, reasons);
}

export function evaluateAssetCompleteness(input: {
  owner?: string | null;
  location?: string | null;
  serialNumber?: string | null;
  ipCount: number;
  warrantyExpiration?: Date | null;
  now?: Date;
}): CompletenessEvaluation {
  const reasons: QualityReason[] = [];
  const operationalReasons: QualityReason[] = [];

  if (!input.owner?.trim()) {
    reasons.push(
      contextReason(
        'asset.owner',
        'owner',
        'Assign the Asset owner or responsible team.',
      ),
    );
  }
  if (!input.location?.trim()) {
    reasons.push(
      contextReason(
        'asset.location',
        'location',
        'Record where the Asset is located.',
      ),
    );
  }
  if (!input.serialNumber?.trim()) {
    reasons.push(
      contextReason(
        'asset.serialNumber',
        'serial number',
        'Record the manufacturer serial number when known.',
      ),
    );
  }
  if (input.ipCount === 0) {
    reasons.push(
      contextReason(
        'asset.ipAddress',
        'IP address',
        'Add at least one Host or Management Access Point IP address.',
      ),
    );
  }

  const now = input.now ?? new Date();
  if (input.warrantyExpiration && input.warrantyExpiration < now) {
    operationalReasons.push(
      operationalReason(
        'asset.warrantyExpired',
        'expired warranty',
        'Review support or replacement planning for the expired warranty.',
      ),
    );
  }

  return finalize(4, reasons, operationalReasons);
}

export function evaluateDatabaseCompleteness(input: {
  host?: string | null;
  hostAssetId?: string | null;
  hostVmId?: string | null;
  ipAddress?: string | null;
  owner?: string | null;
  environment?: string | null;
  backupPolicy?: string | null;
  accountCount: number;
}): CompletenessEvaluation {
  const reasons: QualityReason[] = [];
  if (!input.host?.trim() && !input.hostAssetId && !input.hostVmId) {
    reasons.push(
      contextReason(
        'database.hostIdentity',
        'host identity',
        'Choose a Host name, physical Asset, or Virtual Machine for the Database Instance.',
      ),
    );
  }
  if (!input.ipAddress?.trim()) {
    reasons.push(
      contextReason(
        'database.ipAddress',
        'IP address',
        'Record the Database connection IP address when known.',
      ),
    );
  }
  if (!input.owner?.trim()) {
    reasons.push(
      contextReason(
        'database.owner',
        'owner',
        'Assign the Database owner or responsible team.',
      ),
    );
  }
  if (!input.environment?.trim()) {
    reasons.push(
      contextReason(
        'database.environment',
        'environment',
        'Classify the Database as PROD, UAT, or TEST.',
      ),
    );
  }
  if (!input.backupPolicy?.trim()) {
    reasons.push(
      contextReason(
        'database.backupPolicy',
        'backup policy',
        'Record the backup policy or intentional recovery arrangement.',
      ),
    );
  }
  if (input.accountCount === 0) {
    reasons.push(
      contextReason(
        'database.account',
        'database account',
        'Record at least one Database account when access details are known.',
      ),
    );
  }
  return finalize(6, reasons);
}

export function evaluateVmDiscoveryCompleteness(input: {
  systemName?: string | null;
  environment?: string | null;
  serviceRole?: string | null;
  description?: string | null;
  guestAccountsCount?: number;
}) {
  const reasons: QualityReason[] = [];
  if (!input.systemName?.trim()) {
    reasons.push(
      contextReason(
        'vm.systemName',
        'System Name',
        'Record the operating-system System Name.',
      ),
    );
  }
  if (!input.environment) {
    reasons.push(
      contextReason(
        'vm.environment',
        'Environment',
        'Classify the VM as PROD, UAT, or TEST.',
      ),
    );
  }
  if (!input.serviceRole?.trim()) {
    reasons.push(
      contextReason(
        'vm.serviceRole',
        'Service Role',
        'Describe the VM service role.',
      ),
    );
  }
  if (!input.description?.trim()) {
    reasons.push(
      contextReason(
        'vm.description',
        'Service Purpose',
        'Describe the VM service purpose.',
      ),
    );
  }
  if ((input.guestAccountsCount ?? 0) === 0) {
    reasons.push(
      contextReason(
        'vm.guestAccount',
        'Guest Accounts',
        'Record at least one guest access account when known.',
      ),
    );
  }
  const evaluation = finalize(5, reasons);
  return {
    ...evaluation,
    state: evaluation.needsContext
      ? VmDiscoveryState.NEEDS_CONTEXT
      : VmDiscoveryState.READY_TO_PROMOTE,
  };
}

export function evaluateVmInventoryCompleteness(input: {
  owner?: string | null;
  businessUnit?: string | null;
  serviceRole?: string | null;
  criticality?: string | null;
  componentCount: number;
  lifecycleState?: VmLifecycleState | null;
  syncState?: string | null;
}): CompletenessEvaluation {
  const reasons: QualityReason[] = [];
  const operationalReasons: QualityReason[] = [];

  if (!input.owner?.trim()) {
    reasons.push(
      contextReason(
        'vm.owner',
        'owner',
        'Assign the VM owner or responsible team.',
      ),
    );
  }
  if (!input.businessUnit?.trim()) {
    reasons.push(
      contextReason(
        'vm.businessUnit',
        'business unit',
        'Record the VM business unit.',
      ),
    );
  }
  if (!input.serviceRole?.trim()) {
    reasons.push(
      contextReason(
        'vm.serviceRole',
        'service role',
        'Record the VM service role.',
      ),
    );
  }
  if (!input.criticality) {
    reasons.push(
      contextReason(
        'vm.criticality',
        'criticality',
        'Classify the VM operational criticality.',
      ),
    );
  }
  if (input.componentCount === 0) {
    reasons.push(
      contextReason(
        'vm.applicationComponent',
        'application component',
        'Link the VM to the Application Component that uses it.',
      ),
    );
  }

  if (
    input.lifecycleState === VmLifecycleState.DELETED_IN_VCENTER ||
    input.syncState === 'Missing from source'
  ) {
    operationalReasons.push(
      operationalReason(
        'vm.deletedInVcenter',
        'Deleted in vCenter',
        'Review the missing source VM and archive or restore the Inventory lifecycle intentionally.',
      ),
    );
  }

  return finalize(5, reasons, operationalReasons);
}
