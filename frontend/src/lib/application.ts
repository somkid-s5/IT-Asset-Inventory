export type ApplicationEnvironmentName = "PROD" | "UAT" | "TEST";
export type ApplicationStatus = "ACTIVE" | "ARCHIVED";
export interface ApplicationComponent {
  id: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  assets?: Array<{
    id: string;
    name: string;
    assetId?: string | null;
    relationType?: string;
    responsibleParty?: string | null;
  }>;
  virtualMachines?: Array<{
    id: string;
    name: string;
    systemName?: string;
    relationType?: string;
    responsibleParty?: string | null;
    environment?: string | null;
    lifecycleState?: string;
    archived?: boolean;
  }>;
  logicalDatabases?: Array<{
    id: string;
    name: string;
    status?: string | null;
    archived?: boolean;
    databaseInventory?: {
      id: string;
      name: string;
      environment?: string | null;
      status?: string | null;
    } | null;
  }>;
}
export interface ApplicationEnvironment {
  id: string;
  name: ApplicationEnvironmentName;
  noDatabase: boolean;
  components: ApplicationComponent[];
  access?: ApplicationAccess[];
}
export interface ApplicationCredential {
  id: string;
  username: string;
  role?: string | null;
  hasPassword: boolean;
}
export interface ApplicationAccess {
  id: string;
  applicationId?: string;
  label: string;
  address: string;
  method: string;
  environmentId: string;
  environment?: { id: string; name: ApplicationEnvironmentName } | null;
  sortOrder: number;
  isPrimary: boolean;
  credentials: ApplicationCredential[];
}
export interface Application {
  id: string;
  name: string;
  technicalOwner?: string | null;
  businessUnit?: string | null;
  description?: string | null;
  status: ApplicationStatus;
  environments: ApplicationEnvironment[];
  access: ApplicationAccess[];
  documentLinks?: Array<{ id: string; title: string; updatedAt?: string }>;
  completeness?: {
    complete: boolean;
    completeness: number;
    missingFields: string[];
  };
  updatedAt: string;
}
