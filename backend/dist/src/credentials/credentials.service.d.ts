import { PrismaService } from '../prisma/prisma.service';
import { CreateCredentialDto } from './dto/create-credential.dto';
import { UpdateCredentialDto } from './dto/update-credential.dto';
export declare class CredentialsService {
    private prisma;
    private readonly algorithm;
    private readonly secretKey;
    constructor(prisma: PrismaService);
    private encrypt;
    private decrypt;
    create(createCredentialDto: CreateCredentialDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        username: string;
        encryptedPassword: string;
        lastChangedDate: Date | null;
        assetId: string;
    }>;
    findByAsset(assetId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        username: string;
        lastChangedDate: Date | null;
        assetId: string;
    }[]>;
    revealPassword(id: string, userId: string): Promise<{
        password: string;
    }>;
    update(id: string, updateCredentialDto: UpdateCredentialDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        username: string;
        encryptedPassword: string;
        lastChangedDate: Date | null;
        assetId: string;
    }>;
    remove(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        username: string;
        encryptedPassword: string;
        lastChangedDate: Date | null;
        assetId: string;
    }>;
}
