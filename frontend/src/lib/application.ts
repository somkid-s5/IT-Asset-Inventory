export type ApplicationEnvironmentName = 'PROD' | 'UAT' | 'TEST';
export type ApplicationStatus = 'ACTIVE' | 'ARCHIVED';
export interface ApplicationComponent { id: string; name: string; description?: string | null; sortOrder: number; }
export interface ApplicationEnvironment { id: string; name: ApplicationEnvironmentName; noDatabase: boolean; components: ApplicationComponent[]; }
export interface ApplicationCredential { id: string; username: string; role?: string | null; hasPassword: boolean; }
export interface ApplicationAccess { id: string; label: string; address: string; method: string; credentials: ApplicationCredential[]; }
export interface Application { id: string; name: string; technicalOwner?: string | null; businessUnit?: string | null; description?: string | null; status: ApplicationStatus; environments: ApplicationEnvironment[]; access: ApplicationAccess[]; updatedAt: string; }
