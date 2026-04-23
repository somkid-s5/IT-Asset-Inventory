import { Request } from 'express';
import { CreateUserDto } from './dto/create-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
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
    create(createUserDto: CreateUserDto, req: Request & {
        user: {
            id: string;
        };
    }): Promise<{
        id: string;
        username: string;
        displayName: string;
        avatarSeed: string;
        avatarImage: string | null;
        role: import(".prisma/client").$Enums.Role;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateRole(userId: string, updateUserRoleDto: UpdateUserRoleDto, req: Request & {
        user: {
            id: string;
        };
    }): Promise<{
        id: string;
        username: string;
        displayName: string;
        avatarSeed: string;
        avatarImage: string | null;
        role: import(".prisma/client").$Enums.Role;
        createdAt: Date;
        updatedAt: Date;
    }>;
    remove(userId: string, req: Request & {
        user: {
            id: string;
        };
    }): Promise<{
        success: boolean;
    }>;
    resetPassword(userId: string, resetPasswordDto: ResetPasswordDto, req: Request & {
        user: {
            id: string;
        };
    }): Promise<{
        success: boolean;
    }>;
}
