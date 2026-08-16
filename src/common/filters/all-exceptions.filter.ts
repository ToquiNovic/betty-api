import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { I18nContext, I18nService } from 'nestjs-i18n';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly i18n?: I18nService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Internal server error';
    let errors: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        message = (res as any).message || (res as any).error || 'Http Exception';
        errors = (res as any).errors || null;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(`Unhandled Exception: ${exception.message}`, exception.stack);
    } else {
      this.logger.error('Unhandled non-error exception', JSON.stringify(exception));
    }

    // Try i18n translation if key matches
    const i18nCtx = I18nContext.current(host);
    if (i18nCtx && typeof message === 'string' && message.includes('.')) {
      try {
        message = i18nCtx.t(message);
      } catch {
        // Fallback to original message
      }
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      path: request.url,
      message,
      errors,
      timestamp: new Date().toISOString(),
    });
  }
}
