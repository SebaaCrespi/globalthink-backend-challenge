import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponseBody {
  statusCode: number;
  timestamp: string;
  path: string;
  message: string | string[];
}

/**
 * Catch-all exception filter. Known `HttpException`s keep their status and
 * message; anything else is reported as a 500 with a generic message while the
 * raw error is logged for diagnostics.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string | string[];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = this.extractMessage(exception);
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      this.logger.error(
        'Unhandled exception',
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ErrorResponseBody = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request?.url ?? 'unknown',
      message,
    };

    response.status(status).json(body);
  }

  /**
   * Extracts the message from an HttpException, preserving the array form
   * produced by ValidationPipe instead of collapsing it into a string.
   */
  private extractMessage(exception: HttpException): string | string[] {
    const res = exception.getResponse();

    if (typeof res === 'string') {
      return res;
    }

    if (typeof res === 'object' && res !== null && 'message' in res) {
      return (res as { message: string | string[] }).message;
    }

    return exception.message;
  }
}
