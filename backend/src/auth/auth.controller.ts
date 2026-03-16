import { Body, Controller, HttpCode, HttpStatus, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('api/auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('register')
    register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto);
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto);
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
}
