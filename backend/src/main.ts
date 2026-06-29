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

  const app = await NestFactory.create(AppModule);

  // Security headers with CORS-friendly settings for assets
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Enable CORS with credentials support
  app.enableCors({
    origin:
      process.env.FRONTEND_URL ||
      (process.env.NODE_ENV === 'production' ? false : 'http://localhost:3000'),
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
