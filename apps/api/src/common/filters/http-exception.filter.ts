// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ErrorCodes } from '@tcrn/shared';
import { Request, Response } from 'express';


import { error } from '../response.util';

/**
 * Error code mapping from HTTP status
 */
const HTTP_STATUS_TO_ERROR_CODE: Record<number, string> = {
  400: ErrorCodes.VALIDATION_FAILED,
  401: ErrorCodes.AUTH_INVALID_CREDENTIALS,
  403: ErrorCodes.PERM_ACCESS_DENIED,
  404: ErrorCodes.RES_NOT_FOUND,
  409: ErrorCodes.RES_VERSION_MISMATCH,
  422: ErrorCodes.VALIDATION_FAILED,
  429: ErrorCodes.SYS_RATE_LIMITED,
  500: ErrorCodes.SYS_ERROR,
};

/**
 * Global HTTP Exception Filter
 * PRD §4.1: Standardized API error responses
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    const requestId = (request.headers['x-request-id'] as string) || 
                      (request as unknown as { requestId?: string }).requestId;

    let status: number;
    let errorCode: string;
    let message: string;
    let details: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        errorCode = HTTP_STATUS_TO_ERROR_CODE[status] || ErrorCodes.SYS_ERROR;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as Record<string, unknown>;
        
        // Support custom error code from application
        errorCode = (responseObj.code as string) || 
                   HTTP_STATUS_TO_ERROR_CODE[status] || 
                   ErrorCodes.SYS_ERROR;
        
        message = (responseObj.message as string) || 
                 exception.message || 
                 'An error occurred';
        
        // Support validation errors with field details
        if (responseObj.details) {
          details = responseObj.details as Record<string, unknown>;
        } else if (Array.isArray(responseObj.message)) {
          details = { fields: responseObj.message };
        }
      } else {
        errorCode = HTTP_STATUS_TO_ERROR_CODE[status] || ErrorCodes.SYS_ERROR;
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      errorCode = ErrorCodes.SYS_ERROR;
      message = process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : exception.message;
      
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      );
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      errorCode = ErrorCodes.SYS_ERROR;
      message = 'Unknown error occurred';
    }

    // Log error details
    this.logger.warn(
      `${request.method} ${request.url} - ${status} ${errorCode}: ${message}`,
      {
        requestId,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      },
    );

    response.status(status).json(error(errorCode, message, details, requestId));
  }
}
