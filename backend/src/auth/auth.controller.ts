import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, Req, Res, UseGuards, Headers, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('api/auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }
    
    @Get('me')
    @UseGuards(JwtAuthGuard)
    async me(@Req() req: Request & { user: { id: string } }) {
        return this.authService.me(req.user.id);
    }

    @Post('register')
    async register(
        @Body() registerDto: RegisterDto, 
        @Res({ passthrough: true }) res: Response,
        @Headers('x-registration-key') registrationKey?: string,
    ) {
        const userCount = await this.authService.getUserCount();
        const secret = process.env.REGISTRATION_SECRET;

        // Only enforce secret if at least one user exists
        if (userCount > 0) {
            if (!secret || registrationKey !== secret) {
                throw new UnauthorizedException('Registration is restricted. Valid registration key required.');
            }
        }

        const result = await this.authService.register(registerDto);
        this.setAuthCookie(res, result.access_token);
        return { user: result.user };
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
        const result = await this.authService.login(loginDto);
        this.setAuthCookie(res, result.access_token);
        return { user: result.user };
    }

    private setAuthCookie(res: Response, token: string) {
        res.cookie('access_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000, // 1 day
            path: '/',
        });
    }

    @Patch('change-password')
    @UseGuards(JwtAuthGuard)
    changePassword(
        @Body() changePasswordDto: ChangePasswordDto,
        @Req() req: Request & { user: { id: string } },
    ) {
        return this.authService.changePassword(req.user.id, changePasswordDto.currentPassword, changePasswordDto.newPassword);
    }

    @Patch('profile')
    @UseGuards(JwtAuthGuard)
    updateProfile(
        @Body() updateProfileDto: UpdateProfileDto,
        @Req() req: Request & { user: { id: string } },
    ) {
        return this.authService.updateProfile(req.user.id, updateProfileDto.displayName, updateProfileDto.avatarSeed, updateProfileDto.avatarImage);
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    logout(@Res({ passthrough: true }) res: Response) {
        res.clearCookie('access_token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/',
        });
        return { success: true };
    }
}
