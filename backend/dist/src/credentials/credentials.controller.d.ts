import { CredentialsService } from './credentials.service';
import { CreateCredentialDto } from './dto/create-credential.dto';
import { UpdateCredentialDto } from './dto/update-credential.dto';
export declare class CredentialsController {
    private readonly credentialsService;
    constructor(credentialsService: CredentialsService);
    create(createCredentialDto: CreateCredentialDto, req: {
        user: {
            id: string;
        };
    }): Promise<{
        username: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: string | null;
        nodeLabel: string | null;
        manageType: string | null;
        version: string | null;
        assetId: string;
        encryptedPassword: string;
        lastChangedDate: Date | null;
    }>;
    findByAsset(assetId: string): Promise<{
        username: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        assetId: string;
        lastChangedDate: Date | null;
    }[]>;
    revealPassword(id: string, req: {
        user: {
            id: string;
        };
    }): Promise<{
        password: string;
    }>;
    update(id: string, updateCredentialDto: UpdateCredentialDto, req: {
        user: {
            id: string;
        };
    }): Promise<{
        username: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: string | null;
        nodeLabel: string | null;
        manageType: string | null;
        version: string | null;
        assetId: string;
        encryptedPassword: string;
        lastChangedDate: Date | null;
    }>;
    remove(id: string, req: {
        user: {
            id: string;
        };
    }): Promise<{
        username: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: string | null;
        nodeLabel: string | null;
        manageType: string | null;
        version: string | null;
        assetId: string;
        encryptedPassword: string;
        lastChangedDate: Date | null;
    }>;
}
