import { Request } from 'express';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(registerDto: RegisterDto, res: Response): Promise<{
        user: {
            id: string;
            username: string;
            displayName: string;
            avatarSeed: string;
            avatarImage: string | null;
            role: import(".prisma/client").$Enums.Role;
        };
    }>;
    login(loginDto: LoginDto, res: Response): Promise<{
        user: {
            id: string;
            username: string;
            displayName: string;
            avatarSeed: string;
            avatarImage: string | null;
            role: import(".prisma/client").$Enums.Role;
        };
    }>;
    private setAuthCookie;
    changePassword(changePasswordDto: ChangePasswordDto, req: Request & {
        user: {
            id: string;
        };
    }): Promise<{
        success: boolean;
    }>;
    updateProfile(updateProfileDto: UpdateProfileDto, req: Request & {
        user: {
            id: string;
        };
    }): Promise<{
        user: {
            id: string;
            username: string;
            displayName: string;
            avatarSeed: string;
            avatarImage: string | null;
            role: import(".prisma/client").$Enums.Role;
        };
    }>;
    logout(res: Response): {
        success: boolean;
    };
}
