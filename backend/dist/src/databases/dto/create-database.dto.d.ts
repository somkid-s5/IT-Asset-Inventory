declare class DatabaseAccountDto {
    username: string;
    role: string;
    password: string;
    privileges: string[];
    note?: string;
}
export declare class CreateDatabaseDto {
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
    linkedApps?: string[];
    maintenanceWindow?: string;
    status?: string;
    note?: string;
    accounts: DatabaseAccountDto[];
}
export {};
