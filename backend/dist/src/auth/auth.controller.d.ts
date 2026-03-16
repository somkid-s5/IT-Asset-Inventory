import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(registerDto: RegisterDto): Promise<{
        access_token: string;
        user: {
            id: any;
            username: any;
            displayName: any;
            avatarSeed: any;
            avatarImage: any;
            role: any;
        };
    }>;
    login(loginDto: LoginDto): Promise<{
        access_token: string;
        user: {
            id: any;
            username: any;
            displayName: any;
            avatarSeed: any;
            avatarImage: any;
            role: any;
        };
    }>;
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
}
