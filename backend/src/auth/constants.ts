import { ConfigService } from '@nestjs/config';

/**
 * Resolve the JWT signing secret from the environment.
 *
 * SECURITY: There used to be a hardcoded fallback (`'super-secret-key'`)
 * that silently kicked in when `JWT_SECRET` was missing. That fallback
 * allowed anyone who knew the source code to forge valid JWTs. We now
 * fail fast at startup instead of ever trusting a baked-in secret.
 */
export function resolveJwtSecret(configService: ConfigService): string {
  const secret = configService.get<string>('JWT_SECRET');
  if (!secret) {
    throw new Error(
      'FATAL: JWT_SECRET environment variable is not set. ' +
        'Refusing to start with an insecure signing secret. ' +
        'Set JWT_SECRET (e.g. a 64+ char random string) before booting.',
    );
  }
  return secret;
}
