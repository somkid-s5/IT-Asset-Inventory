export type VmPowerState = 'RUNNING' | 'STOPPED' | 'SUSPENDED';
export type VmInventoryEnvironment = 'PROD' | 'TEST' | 'DEV';
export type VmDiscoveryState = 'NEEDS_CONTEXT' | 'READY_TO_PROMOTE' | 'DRIFTED';
export type VmLifecycleState = 'DRAFT' | 'ACTIVE' | 'DELETED_IN_VCENTER';
export type VmCriticality = 'MISSION_CRITICAL' | 'BUSINESS_CRITICAL' | 'STANDARD';

export interface VmGuestAccount {
  username: string;
  password: string;
  accessMethod: string;
  role: string;
  note?: string | null;
}

export interface VmSourceHistoryItem {
  label: string;
  version: string;
  lastSeen: string;
  status: string;
}

export interface VmVCenterSource {
  id: string;
  name: string;
  version: string;
  endpoint: string;
  vmCount: number;
  status: string;
  syncInterval: string;
  lastSyncAt: string;
}

export interface VmDiscoveryItem {
  id: string;
  name: string;
  systemName?: string | null;
  moid: string;
  sourceName: string;
  sourceVersion: string;
  cluster: string;
  host: string;
  guestOs: string;
  primaryIp: string;
  cpuCores: number;
  memoryGb: number;
  storageGb: number;
  networkLabel: string;
  powerState: VmPowerState;
  state: VmDiscoveryState;
  completeness: number;
  missingFields: string[];
  lastSeen: string;
  tags: string[];
  guestAccountsCount: number;
  suggestedOwner?: string | null;
  suggestedEnvironment?: VmInventoryEnvironment | null;
  suggestedServiceRole?: string | null;
  suggestedCriticality?: VmCriticality | null;
  note?: string | null;
}

export interface VmInventoryItem {
  id: string;
  name: string;
  systemName: string;
  moid: string;
  vcenterName: string;
  vcenterVersion: string;
  environment: VmInventoryEnvironment;
  cluster: string;
  host: string;
  guestOs: string;
  primaryIp: string;
  cpuCores: number;
  memoryGb: number;
  storageGb: number;
  networkLabel: string;
  powerState: VmPowerState;
  lifecycleState: VmLifecycleState;
  syncState: 'Synced';
  owner: string;
  businessUnit: string;
  slaTier: string;
  serviceRole: string;
  criticality: VmCriticality;
  description: string;
  tags: string[];
  lastSyncAt: string;
  syncedFields: string[];
  managedFields: string[];
  guestAccountsCount: number;
}

export interface VmInventoryDetail extends VmInventoryItem {
  notes: string;
  sourceHistory: VmSourceHistoryItem[];
  guestAccounts: VmGuestAccount[];
}

export const VM_ENVIRONMENT_FILTERS: Array<{ label: string; value: 'ALL' | VmInventoryEnvironment }> = [
  { label: 'All', value: 'ALL' },
  { label: 'Production', value: 'PROD' },
  { label: 'Test', value: 'TEST' },
  { label: 'Dev', value: 'DEV' },
];

export const VM_LIFECYCLE_FILTERS: Array<{ label: string; value: 'ALL' | VmLifecycleState }> = [
  { label: 'All states', value: 'ALL' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Deleted', value: 'DELETED_IN_VCENTER' },
];

export const VM_CRITICALITY_OPTIONS: Array<{ label: string; value: VmCriticality }> = [
  { label: 'Mission Critical', value: 'MISSION_CRITICAL' },
  { label: 'Business Critical', value: 'BUSINESS_CRITICAL' },
  { label: 'Standard', value: 'STANDARD' },
];

export const VM_SOURCE_FILTERS = [
  { label: 'All sources', value: 'ALL' },
  { label: 'vc-prod-01', value: 'vc-prod-01' },
  { label: 'vc-test-01', value: 'vc-test-01' },
  { label: 'vc-lab-01', value: 'vc-lab-01' },
];

export const VM_VCENTER_SOURCES: VmVCenterSource[] = [
  {
    id: 'vc-prod-01',
    name: 'vc-prod-01',
    version: '8.0.2',
    endpoint: 'vcenter-prod.dc1.local',
    vmCount: 1,
    status: 'Healthy',
    syncInterval: '15 min',
    lastSyncAt: '10 min ago',
  },
  {
    id: 'vc-test-01',
    name: 'vc-test-01',
    version: '8.0.2',
    endpoint: 'vcenter-test.dc1.local',
    vmCount: 1,
    status: 'Healthy',
    syncInterval: '15 min',
    lastSyncAt: '4 min ago',
  },
  {
    id: 'vc-lab-01',
    name: 'vc-lab-01',
    version: '7.0.3',
    endpoint: 'vcenter-lab.dc1.local',
    vmCount: 0,
    status: 'Lagging',
    syncInterval: '30 min',
    lastSyncAt: '2 hours ago',
  },
];

export const VM_INVENTORY_RECORDS: VmInventoryDetail[] = [
  {
    id: 'vm-prod-api-01',
    name: 'vm-prod-api-01',
    systemName: 'Trade API Platform',
    moid: 'vm-101',
    vcenterName: 'vc-prod-01',
    vcenterVersion: '8.0.2',
    environment: 'PROD',
    cluster: 'Prod Cluster A',
    host: 'esx-07.dc1',
    guestOs: 'Ubuntu 22.04 LTS',
    primaryIp: '10.30.10.41',
    cpuCores: 8,
    memoryGb: 32,
    storageGb: 240,
    networkLabel: 'VLAN-PROD-APP',
    powerState: 'RUNNING',
    lifecycleState: 'ACTIVE',
    syncState: 'Synced',
    owner: 'Infra Team',
    businessUnit: 'Platform',
    slaTier: 'Tier 2',
    serviceRole: 'API Runtime',
    criticality: 'MISSION_CRITICAL',
    description: 'Runs the trade API service used by upstream application workflows.',
    tags: ['api', 'linux', 'runtime'],
    lastSyncAt: '10 min ago',
    syncedFields: ['VM Name', 'MoID', 'Power State', 'Cluster', 'Host', 'Guest OS', 'Primary IP', 'CPU', 'Memory', 'Storage', 'Network', 'vCenter Tags'],
    managedFields: ['System Name', 'Owner', 'Environment', 'Business Unit', 'SLA Tier', 'Service Role', 'Criticality', 'Service Purpose', 'Custom Notes'],
    guestAccountsCount: 2,
    notes: 'This VM is promoted from vCenter into the active inventory after approval.',
    sourceHistory: [
      { label: 'vc-prod-01', version: '8.0.2', lastSeen: '10 min ago', status: 'Healthy' },
      { label: 'vc-prod-02', version: '8.0.1', lastSeen: '1 day ago', status: 'Fallback source' },
    ],
    guestAccounts: [
      {
        username: 'root',
        password: 'Root#2026',
        accessMethod: 'SSH',
        role: 'OS admin',
        note: 'Emergency access only',
      },
      {
        username: 'svc_api',
        password: 'SvcApi#2026',
        accessMethod: 'SSH',
        role: 'Service account',
        note: 'Used by deploy pipeline',
      },
    ],
  },
  {
    id: 'vm-test-web-02',
    name: 'vm-test-web-02',
    systemName: 'QA Web Portal',
    moid: 'vm-208',
    vcenterName: 'vc-test-01',
    vcenterVersion: '8.0.2',
    environment: 'TEST',
    cluster: 'Test Cluster B',
    host: 'esx-03.dc1',
    guestOs: 'Windows Server 2022',
    primaryIp: '10.30.20.18',
    cpuCores: 4,
    memoryGb: 16,
    storageGb: 160,
    networkLabel: 'VLAN-TEST-WEB',
    powerState: 'RUNNING',
    lifecycleState: 'ACTIVE',
    syncState: 'Synced',
    owner: 'QA Team',
    businessUnit: 'Quality Assurance',
    slaTier: 'Tier 3',
    serviceRole: 'Web Frontend',
    criticality: 'STANDARD',
    description: 'Hosts the QA web portal used for validation and release testing.',
    tags: ['web', 'iis', 'qa'],
    lastSyncAt: '4 min ago',
    syncedFields: ['VM Name', 'MoID', 'Power State', 'Cluster', 'Host', 'Guest OS', 'Primary IP', 'CPU', 'Memory', 'Storage', 'Network', 'vCenter Tags'],
    managedFields: ['System Name', 'Owner', 'Environment', 'Business Unit', 'SLA Tier', 'Service Role', 'Criticality', 'Service Purpose', 'Custom Notes'],
    guestAccountsCount: 1,
    notes: 'A good example of a complete record that can be promoted immediately after sync.',
    sourceHistory: [
      { label: 'vc-test-01', version: '8.0.2', lastSeen: '4 min ago', status: 'Healthy' },
      { label: 'vc-lab-01', version: '7.0.3', lastSeen: '8 hr ago', status: 'Ignored duplicate' },
    ],
    guestAccounts: [
      {
        username: 'Administrator',
        password: 'Win#2026!',
        accessMethod: 'RDP',
        role: 'Windows admin',
        note: 'App team keeps this in the guest OS only',
      },
    ],
  },
];

export const VM_DISCOVERY_QUEUE: VmDiscoveryItem[] = [
  {
    id: 'draft-vm-01',
    name: 'vm-prod-batch-03',
    systemName: null,
    moid: 'vm-501',
    sourceName: 'vc-prod-01',
    sourceVersion: '8.0.2',
    cluster: 'Prod Cluster A',
    host: 'esx-07.dc1',
    guestOs: 'Rocky Linux 9',
    primaryIp: '10.30.10.91',
    cpuCores: 6,
    memoryGb: 24,
    storageGb: 320,
    networkLabel: 'VLAN-PROD-BATCH',
    powerState: 'RUNNING',
    state: 'NEEDS_CONTEXT',
    completeness: 58,
    missingFields: ['System Name', 'Owner', 'Business Unit', 'SLA Tier', 'Service Role', 'Criticality', 'Service Purpose'],
    lastSeen: '3 min ago',
    tags: ['batch', 'linux'],
    guestAccountsCount: 2,
    suggestedOwner: null,
    suggestedEnvironment: 'PROD',
    suggestedServiceRole: 'Batch Worker',
    suggestedCriticality: 'BUSINESS_CRITICAL',
    note: 'Discovered in vCenter and waiting for AssetOps context.',
  },
  {
    id: 'draft-vm-02',
    name: 'vm-test-ui-04',
    systemName: null,
    moid: 'vm-612',
    sourceName: 'vc-test-01',
    sourceVersion: '8.0.2',
    cluster: 'Test Cluster B',
    host: 'esx-05.dc1',
    guestOs: 'Windows Server 2022',
    primaryIp: '10.30.20.74',
    cpuCores: 4,
    memoryGb: 12,
    storageGb: 180,
    networkLabel: 'VLAN-TEST-UI',
    powerState: 'RUNNING',
    state: 'READY_TO_PROMOTE',
    completeness: 86,
    missingFields: ['System Name', 'Business Unit', 'Service Role'],
    lastSeen: '8 min ago',
    tags: ['ui', 'test'],
    guestAccountsCount: 1,
    suggestedOwner: 'QA Team',
    suggestedEnvironment: 'TEST',
    suggestedServiceRole: 'UI Automation',
    suggestedCriticality: 'STANDARD',
    note: 'Almost complete. Only one business field is missing.',
  },
  {
    id: 'draft-vm-03',
    name: 'vm-lab-legacy-01',
    systemName: null,
    moid: 'vm-703',
    sourceName: 'vc-lab-01',
    sourceVersion: '7.0.3',
    cluster: 'Lab Cluster',
    host: 'pve-node-02',
    guestOs: 'Ubuntu 20.04',
    primaryIp: '10.99.9.12',
    cpuCores: 2,
    memoryGb: 8,
    storageGb: 80,
    networkLabel: 'VLAN-LAB-LEGACY',
    powerState: 'STOPPED',
    state: 'DRIFTED',
    completeness: 45,
    missingFields: ['System Name', 'Owner', 'Environment', 'SLA Tier', 'Service Role', 'Criticality', 'Service Purpose', 'Guest Accounts'],
    lastSeen: '2 hours ago',
    tags: ['lab', 'legacy'],
    guestAccountsCount: 0,
    suggestedOwner: null,
    suggestedEnvironment: 'DEV',
    suggestedServiceRole: 'Legacy Utility',
    suggestedCriticality: 'STANDARD',
    note: 'Host and IP changed after maintenance. Needs review before promotion.',
  },
];

export function getVmRecord(id: string) {
  return VM_INVENTORY_RECORDS.find((record) => record.id === id) ?? null;
}

export function getDiscoveryRecord(id: string) {
  return VM_DISCOVERY_QUEUE.find((record) => record.id === id) ?? null;
}
