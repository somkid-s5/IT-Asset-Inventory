export interface DatabaseAccountFormValue {
  username: string;
  password: string;
  role: string;
  privileges: string;
  note: string;
}

export interface DatabaseLinkedAppFormValue {
  ipAddress: string;
  description: string;
}

export type DatabaseEnvironment = 'PROD' | 'TEST' | 'DEV';

export interface DatabaseInventoryItem {
  id: string;
  name: string;
  engine: string;
  version?: string | null;
  environment?: string | null;
  host: string;
  ipAddress: string;
  port?: string | null;
  serviceName?: string | null;
  owner?: string | null;
  backupPolicy?: string | null;
  replication?: string | null;
  linkedApps: string[];
  maintenanceWindow?: string | null;
  status?: string | null;
  note?: string | null;
  accountsCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface DatabaseAccountDetail {
  id: string;
  username: string;
  role?: string | null;
  password?: string;
  hasPassword?: boolean;
  privileges: string[];
  note?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface DatabaseInventoryDetail extends Omit<DatabaseInventoryItem, 'accountsCount'> {
  accounts: DatabaseAccountDetail[];
}

export interface DatabaseInventoryPayload {
  name: string;
  engine: string;
  version?: string;
  environment?: string;
  host: string;
  ipAddress: string;
  port?: string;
  serviceName?: string;
  owner?: string;
  backupPolicy?: string;
  replication?: string;
  linkedApps: string[];
  maintenanceWindow?: string;
  status?: string;
  note?: string;
  accounts: Array<{
    username: string;
    password: string;
    role: string;
    privileges: string[];
    note?: string;
  }>;
}

export const ENVIRONMENT_FILTERS: Array<{ label: string; value: 'ALL' | DatabaseEnvironment }> = [
  { label: 'All', value: 'ALL' },
  { label: 'Production', value: 'PROD' },
  { label: 'Test', value: 'TEST' },
  { label: 'Dev', value: 'DEV' },
];

export function splitCommaSeparated(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function joinCommaSeparated(values?: string[] | null) {
  return (values ?? []).join(', ');
}

export function parseLinkedAppEntry(value: string): DatabaseLinkedAppFormValue {
  const [ipAddress, ...rest] = value.split('|');

  return {
    ipAddress: ipAddress?.trim() ?? '',
    description: rest.join('|').trim(),
  };
}

export function parseLinkedApps(values?: string[] | null) {
  return (values ?? []).map((value) => parseLinkedAppEntry(value));
}

export function serializeLinkedApps(values: DatabaseLinkedAppFormValue[]) {
  return values
    .map(({ ipAddress, description }) => {
      const normalizedIp = ipAddress.trim();
      const normalizedDescription = description.trim();

      if (!normalizedIp && !normalizedDescription) {
        return null;
      }

      return normalizedDescription ? `${normalizedIp} | ${normalizedDescription}` : normalizedIp;
    })
    .filter((value): value is string => Boolean(value));
}
