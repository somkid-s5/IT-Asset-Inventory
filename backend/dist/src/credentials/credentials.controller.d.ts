import { CredentialsService } from './credentials.service';
import { CreateCredentialDto } from './dto/create-credential.dto';
import { UpdateCredentialDto } from './dto/update-credential.dto';
export declare class CredentialsController {
    private readonly credentialsService;
    constructor(credentialsService: CredentialsService);
    create(createCredentialDto: CreateCredentialDto): Promise<{
        id: string;
        username: string;
        createdAt: Date;
        updatedAt: Date;
        assetId: string;
        type: string | null;
        manageType: string | null;
        nodeLabel: string | null;
        version: string | null;
        encryptedPassword: string;
        lastChangedDate: Date | null;
    }>;
    findByAsset(assetId: string): Promise<{
        id: string;
        username: string;
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
    update(id: string, updateCredentialDto: UpdateCredentialDto): Promise<{
        id: string;
        username: string;
        createdAt: Date;
        updatedAt: Date;
        assetId: string;
        type: string | null;
        manageType: string | null;
        nodeLabel: string | null;
        version: string | null;
        encryptedPassword: string;
        lastChangedDate: Date | null;
    }>;
    remove(id: string): Promise<{
        id: string;
        username: string;
        createdAt: Date;
        updatedAt: Date;
        assetId: string;
        type: string | null;
        manageType: string | null;
        nodeLabel: string | null;
        version: string | null;
        encryptedPassword: string;
        lastChangedDate: Date | null;
    }>;
}
