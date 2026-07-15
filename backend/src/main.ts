import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { GlobalExceptionFilter } from './filters/http-exception.filter';

async function bootstrap() {
  if (
    process.env.NODE_ENV === 'production' &&
    !process.env.REGISTRATION_SECRET
  ) {
    console.error(
      'CRITICAL: REGISTRATION_SECRET environment variable is required in production mode',
    );
    process.exit(1);
  }

  // SECURITY: refuse to boot without an explicit JWT signing secret. The old
  // code silently fell back to a hardcoded 'super-secret-key', which let
  // anyone with source access forge tokens. See src/auth/constants.ts.
  if (!process.env.JWT_SECRET) {
    console.error(
      'CRITICAL: JWT_SECRET environment variable is not set. Refusing to start with an insecure signing secret.',
    );
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule);

  // Trust proxy (necessary when behind Nginx reverse proxy to get correct protocol/IP)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // Security headers with CORS-friendly settings for assets
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Enable CORS with credentials support
  const allowedOrigins = (process.env.FRONTEND_URL ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    credentials: true, // Allow cookies
    exposedHeaders: ['set-cookie'],
  });

  // Enable cookie parser
  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap().catch((err) => {
  console.error('Fatal error during bootstrap:', err);
  process.exit(1);
});
