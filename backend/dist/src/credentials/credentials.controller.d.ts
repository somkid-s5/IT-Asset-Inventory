import { CredentialsService } from './credentials.service';
import { CreateCredentialDto } from './dto/create-credential.dto';
import { UpdateCredentialDto } from './dto/update-credential.dto';
export declare class CredentialsController {
    private readonly credentialsService;
    constructor(credentialsService: CredentialsService);
    create(createCredentialDto: CreateCredentialDto): Promise<{
        id: string;
        assetId: string;
        createdAt: Date;
        updatedAt: Date;
        username: string;
        encryptedPassword: string;
        lastChangedDate: Date | null;
    }>;
    findByAsset(assetId: string): Promise<{
        id: string;
        assetId: string;
        createdAt: Date;
        updatedAt: Date;
        username: string;
        lastChangedDate: Date | null;
    }[]>;
    revealPassword(id: string, req: any): Promise<{
        password: string;
    }>;
    update(id: string, updateCredentialDto: UpdateCredentialDto): Promise<{
        id: string;
        assetId: string;
        createdAt: Date;
        updatedAt: Date;
        username: string;
        encryptedPassword: string;
        lastChangedDate: Date | null;
    }>;
    remove(id: string): Promise<{
        id: string;
        assetId: string;
        createdAt: Date;
        updatedAt: Date;
        username: string;
        encryptedPassword: string;
        lastChangedDate: Date | null;
    }>;
}
