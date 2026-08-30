import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { LinkedInError, type LinkedInFailureKind } from '../../linkedin/linkedin.errors';

interface ErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
}

const LINKEDIN_STATUS: Record<LinkedInFailureKind, HttpStatus> = {
  invalid_url: HttpStatus.BAD_REQUEST,
  not_found: HttpStatus.NOT_FOUND,
  session_invalid: HttpStatus.SERVICE_UNAVAILABLE,
  rate_limited: HttpStatus.TOO_MANY_REQUESTS,
  blocked: HttpStatus.BAD_GATEWAY,
  timeout: HttpStatus.GATEWAY_TIMEOUT,
  upstream_error: HttpStatus.BAD_GATEWAY,
  not_configured: HttpStatus.SERVICE_UNAVAILABLE,
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const body = this.toBody(exception, req.url);

    if (body.statusCode >= 500) {
      this.logger.error(
        `${req.method} ${req.url} -> ${body.statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    res.status(body.statusCode).json(body);
  }

  private toBody(exception: unknown, path: string): ErrorBody {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      const message =
        typeof response === 'string'
          ? response
          : ((response as { message?: string | string[] }).message ?? exception.message);

      return { statusCode: status, error: nameFor(status), message, path };
    }

    if (exception instanceof LinkedInError) {
      const status = LINKEDIN_STATUS[exception.kind];
      return { statusCode: status, error: exception.kind, message: exception.message, path };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
      path,
    };
  }
}

function nameFor(status: number): string {
  return HttpStatus[status] !== undefined
    ? String(HttpStatus[status]).replace(/_/g, ' ').toLowerCase()
    : 'error';
}
