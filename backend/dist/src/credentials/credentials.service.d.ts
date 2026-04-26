import { PrismaService } from '../prisma/prisma.service';
import { CreateCredentialDto } from './dto/create-credential.dto';
import { UpdateCredentialDto } from './dto/update-credential.dto';
export declare class CredentialsService {
    private prisma;
    private readonly algorithm;
    private readonly secretKey;
    constructor(prisma: PrismaService);
    encrypt(text: string): string;
    decrypt(text: string): string;
    create(createCredentialDto: CreateCredentialDto, userId: string): Promise<{
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
    revealPassword(id: string, userId: string): Promise<{
        password: string;
    }>;
    update(id: string, updateCredentialDto: UpdateCredentialDto, userId: string): Promise<{
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
    remove(id: string, userId: string): Promise<{
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
    private getKeyBuffer;
}
