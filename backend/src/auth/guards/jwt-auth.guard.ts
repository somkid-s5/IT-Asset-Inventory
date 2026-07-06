import { ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const result = super.canActivate(context);
    let isValid = false;

    if (typeof result === 'boolean') {
      isValid = result;
    } else if (result instanceof Promise) {
      isValid = await result;
    } else {
      // Handle Observable if any
      isValid = await (result as any).toPromise();
    }

    if (!isValid) {
      return false;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    const path = request.path || request.url || '';
    const isAllowedPath = 
      path.includes('/api/auth/change-password') || 
      path.includes('/api/auth/logout') || 
      path.includes('/api/auth/me');

    if (user && user.mustChangePassword && !isAllowedPath) {
      throw new ForbiddenException({
        message: 'Password change required before accessing other features.',
        code: 'PASSWORD_CHANGE_REQUIRED',
      });
    }

    return true;
  }
}
