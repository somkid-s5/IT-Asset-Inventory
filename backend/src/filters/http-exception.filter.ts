import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.getResponse();
    } else if (exception instanceof Prisma.PrismaClientInitializationError) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      message =
        'Database connection failed. Please ensure the database service is running.';
      this.logger.error(`Prisma Initialization Error: ${exception.message}`);
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle specific Prisma errors if needed
      if (exception.code === 'P1001') {
        status = HttpStatus.SERVICE_UNAVAILABLE;
        message =
          'Cannot reach database server. Please check your network or database status.';
      }
      this.logger.error(
        `Prisma Known Request Error [${exception.code}]: ${exception.message}`,
      );
    } else if (exception instanceof Error) {
      this.logger.error(
        `Unhandled Error: ${exception.message}`,
        exception.stack,
      );
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      message: typeof message === 'object' ? message : { error: message },
      // Do not send stack trace in production
      ...(process.env.NODE_ENV !== 'production' && {
        stack: exception instanceof Error ? exception.stack : undefined,
      }),
    });
  }
}
