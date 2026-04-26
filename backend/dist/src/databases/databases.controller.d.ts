import { CreateDatabaseDto } from './dto/create-database.dto';
import { UpdateDatabaseDto } from './dto/update-database.dto';
import { DatabasesService } from './databases.service';
export declare class DatabasesController {
    private readonly databasesService;
    constructor(databasesService: DatabasesService);
    create(createDatabaseDto: CreateDatabaseDto, req: {
        user: {
            id: string;
        };
    }): Promise<{
        accounts: {
            id: string;
            username: string;
            role: string | null;
            password: string;
            privileges: string[];
            note: string | null;
            createdAt: Date;
            updatedAt: Date;
        }[];
        id: string;
        name: string;
        engine: string;
        version: string | null;
        environment: string | null;
        host: string;
        ipAddress: string;
        port: string | null;
        serviceName: string | null;
        owner: string | null;
        backupPolicy: string | null;
        replication: string | null;
        linkedApps: string[];
        maintenanceWindow: string | null;
        status: string | null;
        note: string | null;
        accountsCount: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findAll(): Promise<{
        id: string;
        name: string;
        engine: string;
        version: string | null;
        environment: string | null;
        host: string;
        ipAddress: string;
        port: string | null;
        serviceName: string | null;
        owner: string | null;
        backupPolicy: string | null;
        replication: string | null;
        linkedApps: string[];
        maintenanceWindow: string | null;
        status: string | null;
        note: string | null;
        accountsCount: number;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    findOne(id: string): Promise<{
        accounts: {
            id: string;
            username: string;
            role: string | null;
            password: string;
            privileges: string[];
            note: string | null;
            createdAt: Date;
            updatedAt: Date;
        }[];
        id: string;
        name: string;
        engine: string;
        version: string | null;
        environment: string | null;
        host: string;
        ipAddress: string;
        port: string | null;
        serviceName: string | null;
        owner: string | null;
        backupPolicy: string | null;
        replication: string | null;
        linkedApps: string[];
        maintenanceWindow: string | null;
        status: string | null;
        note: string | null;
        accountsCount: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(id: string, updateDatabaseDto: UpdateDatabaseDto, req: {
        user: {
            id: string;
        };
    }): Promise<{
        accounts: {
            id: string;
            username: string;
            role: string | null;
            password: string;
            privileges: string[];
            note: string | null;
            createdAt: Date;
            updatedAt: Date;
        }[];
        id: string;
        name: string;
        engine: string;
        version: string | null;
        environment: string | null;
        host: string;
        ipAddress: string;
        port: string | null;
        serviceName: string | null;
        owner: string | null;
        backupPolicy: string | null;
        replication: string | null;
        linkedApps: string[];
        maintenanceWindow: string | null;
        status: string | null;
        note: string | null;
        accountsCount: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
    remove(id: string, req: {
        user: {
            id: string;
        };
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        ipAddress: string;
        version: string | null;
        status: string | null;
        owner: string | null;
        environment: string | null;
        createdByUserId: string;
        note: string | null;
        engine: string;
        host: string;
        port: string | null;
        serviceName: string | null;
        backupPolicy: string | null;
        replication: string | null;
        linkedApps: string[];
        maintenanceWindow: string | null;
    }>;
}
