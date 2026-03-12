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
    revealPassword(id: string, userId: string): Promise<{
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
