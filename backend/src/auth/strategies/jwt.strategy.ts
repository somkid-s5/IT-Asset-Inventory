import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

function extractJwtFromCookie(req: { cookies?: Record<string, string> }) {
  return req?.cookies?.access_token ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        extractJwtFromCookie,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: (() => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET environment variable is missing. Application cannot start.');
        }
        return secret;
      })(),
      passReqToCallback: true,
    });
  }

  async validate(
    req: any,
    payload: { sub: string; username: string; role: string },
  ) {
    const token = ExtractJwt.fromExtractors([
      extractJwtFromCookie,
      ExtractJwt.fromAuthHeaderAsBearerToken(),
    ])(req);

    if (token) {
      const isBlocked = await this.prisma.tokenBlocklist.findUnique({
        where: { token },
      });
      if (isBlocked) {
        throw new UnauthorizedException('Token is revoked');
      }
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('User not found or deactivated');
    }

    return user;
  }
}
