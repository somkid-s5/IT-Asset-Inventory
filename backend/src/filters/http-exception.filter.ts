import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const status = exception instanceof HttpException
            ? exception.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;

        const message = exception instanceof HttpException
            ? exception.getResponse()
            : 'Internal server error';

        response.status(status).json({
            statusCode: status,
            message: typeof message === 'object' ? message : { error: message },
            // Do not send stack trace in production
            ...(process.env.NODE_ENV !== 'production' && { stack: (exception as Error).stack }),
        });
    }
}
