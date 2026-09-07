export type DatabaseAccountScope = "INSTANCE" | "LOGICAL_DATABASES";

export interface DatabaseAccountFormValue {
  id?: string;
  username: string;
  password: string;
  role: string;
  privileges: string;
  note: string;
  scope: DatabaseAccountScope;
  logicalDatabaseIds?: string[];
}

export interface DatabaseLinkedAppFormValue {
  ipAddress: string;
  description: string;
}

export type DatabaseEnvironment = "PROD" | "UAT" | "TEST";

export interface DatabaseHostAssetOption {
  id: string;
  name: string;
  assetId?: string | null;
  type?: string | null;
  location?: string | null;
}

export interface DatabaseHostVmOption {
  id: string;
  name: string;
  systemName?: string | null;
  primaryIp?: string | null;
  lifecycleState?: string | null;
}

export interface DatabaseHostOptions {
  assets: DatabaseHostAssetOption[];
  vms: DatabaseHostVmOption[];
}

export interface DatabaseInventoryItem {
  id: string;
  name: string;
  engine: string;
  version?: string | null;
  environment?: string | null;
  host?: string | null;
  ipAddress?: string | null;
  port?: string | null;
  serviceName?: string | null;
  owner?: string | null;
  backupPolicy?: string | null;
  replication?: string | null;
  linkedApps?: string[];
  maintenanceWindow?: string | null;
  status?: string | null;
  note?: string | null;
  responsibleParty?: string | null;
  hostAsset?: { id: string; name: string; assetId?: string | null } | null;
  hostVm?: { id: string; name: string; systemName?: string | null } | null;
  accountsCount: number;
  needsContext?: boolean;
  contextIssues?: string[];
  createdAt?: string;
  updatedAt?: string;
  documentLinks?: Array<{ id: string; title: string; updatedAt?: string }>;
  logicalDatabases?: Array<{
    id: string;
    name: string;
    description?: string | null;
    status?: string | null;
    componentIds?: string[];
    components?: Array<{
      id: string;
      name: string;
      environment: { id: string; name: string };
      application: { id: string; name: string };
    }>;
  }>;
}

export interface DatabaseAccountDetail {
  id: string;
  username: string;
  role?: string | null;
  password?: string;
  hasPassword?: boolean;
  privileges: string[];
  note?: string | null;
  scope?: DatabaseAccountScope;
  createdAt?: string;
  updatedAt?: string;
  logicalDatabaseIds?: string[];
  logicalDatabaseNames?: string[];
}

export interface DatabaseInventoryListResponse {
  data: DatabaseInventoryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  environmentCounts: Record<"ALL" | DatabaseEnvironment, number>;
}

export interface DatabaseInventoryDetail extends Omit<
  DatabaseInventoryItem,
  "accountsCount" | "linkedApps"
> {
  linkedApps: string[];
  accounts: DatabaseAccountDetail[];
}

export interface DatabaseInventoryPayload {
  name: string;
  engine: string;
  version?: string;
  environment?: string;
  host?: string;
  ipAddress?: string;
  port?: string;
  serviceName?: string;
  owner?: string;
  backupPolicy?: string;
  replication?: string;
  linkedApps?: string[];
  maintenanceWindow?: string;
  status?: string;
  note?: string;
  hostAssetId?: string;
  hostVmId?: string;
  accounts?: Array<{
    id?: string;
    username: string;
    password?: string;
    role: string;
    privileges: string[];
    note?: string;
    scope: DatabaseAccountScope;
    logicalDatabaseIds?: string[];
  }>;
  removedAccountIds?: string[];
  logicalDatabases?: string[];
}

export const ENVIRONMENT_FILTERS: Array<{
  label: string;
  value: "ALL" | DatabaseEnvironment;
}> = [
  { label: "All", value: "ALL" },
  { label: "Production", value: "PROD" },
  { label: "UAT", value: "UAT" },
  { label: "Test", value: "TEST" },
];

export function splitCommaSeparated(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function joinCommaSeparated(values?: string[] | null) {
  return (values ?? []).join(", ");
}

export function parseLinkedAppEntry(value: string): DatabaseLinkedAppFormValue {
  const [ipAddress, ...rest] = value.split("|");

  return {
    ipAddress: ipAddress?.trim() ?? "",
    description: rest.join("|").trim(),
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

      return normalizedDescription
        ? `${normalizedIp} | ${normalizedDescription}`
        : normalizedIp;
    })
    .filter((value): value is string => Boolean(value));
}
