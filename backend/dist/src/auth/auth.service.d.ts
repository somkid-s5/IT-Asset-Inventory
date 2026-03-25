import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { PrismaService } from '../prisma/prisma.service';
export declare class AuthService {
    private prisma;
    private jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    register(registerDto: RegisterDto): Promise<{
        access_token: string;
        user: {
            id: string;
            username: string;
            displayName: string;
            avatarSeed: string;
            avatarImage: string | null;
            role: import(".prisma/client").$Enums.Role;
        };
    }>;
    login(loginDto: LoginDto): Promise<{
        access_token: string;
        user: {
            id: string;
            username: string;
            displayName: string;
            avatarSeed: string;
            avatarImage: string | null;
            role: import(".prisma/client").$Enums.Role;
        };
    }>;
    updateProfile(userId: string, displayName?: string, avatarSeed?: string, avatarImage?: string | null): Promise<{
        user: {
            id: string;
            username: string;
            displayName: string;
            avatarSeed: string;
            avatarImage: string | null;
            role: import(".prisma/client").$Enums.Role;
        };
    }>;
    changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{
        success: boolean;
    }>;
}
