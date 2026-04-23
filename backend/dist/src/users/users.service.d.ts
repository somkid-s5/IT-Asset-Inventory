import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<{
        id: string;
        username: string;
        displayName: string;
        avatarSeed: string;
        avatarImage: string | null;
        role: import(".prisma/client").$Enums.Role;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    create(createUserDto: CreateUserDto, actorUserId: string): Promise<{
        id: string;
        username: string;
        displayName: string;
        avatarSeed: string;
        avatarImage: string | null;
        role: import(".prisma/client").$Enums.Role;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateRole(userId: string, role: Role, currentUserId: string): Promise<{
        id: string;
        username: string;
        displayName: string;
        avatarSeed: string;
        avatarImage: string | null;
        role: import(".prisma/client").$Enums.Role;
        createdAt: Date;
        updatedAt: Date;
    }>;
    remove(userId: string, currentUserId: string): Promise<{
        success: boolean;
    }>;
    resetPassword(userId: string, password: string, actorUserId?: string): Promise<{
        success: boolean;
    }>;
}
