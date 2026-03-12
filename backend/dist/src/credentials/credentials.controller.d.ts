import { CredentialsService } from './credentials.service';
import { CreateCredentialDto } from './dto/create-credential.dto';
import { UpdateCredentialDto } from './dto/update-credential.dto';
export declare class CredentialsController {
    private readonly credentialsService;
    constructor(credentialsService: CredentialsService);
    create(createCredentialDto: CreateCredentialDto): Promise<{
        assetId: string;
        username: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        encryptedPassword: string;
        lastChangedDate: Date | null;
    }>;
    findByAsset(assetId: string): Promise<{
        assetId: string;
        username: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        lastChangedDate: Date | null;
    }[]>;
    revealPassword(id: string, req: any): Promise<{
        password: string;
    }>;
    update(id: string, updateCredentialDto: UpdateCredentialDto): Promise<{
        assetId: string;
        username: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        encryptedPassword: string;
        lastChangedDate: Date | null;
    }>;
    remove(id: string): Promise<{
        assetId: string;
        username: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        encryptedPassword: string;
        lastChangedDate: Date | null;
    }>;
}
