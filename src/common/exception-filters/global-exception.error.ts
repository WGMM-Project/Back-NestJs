import { getAsBooleanConfig } from '@Helper/fn/get-as-config.helper';
import {
  IResponseErrorRequest,
  WinstonLogger,
} from '@Helper/logger/logger.service';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import {
  CannotCreateEntityIdMapError,
  EntityNotFoundError,
  QueryFailedError,
} from 'typeorm';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly nestLogger = new Logger(GlobalExceptionFilter.name);

  constructor(
    private configService: ConfigService,
    private readonly winstonLogger: WinstonLogger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, message, code } = this.processException(exception);

    const logMessage = `${request.method} ${request.url}`;
    const logError =
      exception instanceof Error ? exception.stack : String(exception);

    const transformed = GlobalResponseError(statusCode, message, code, request);

    if (
      code === 'InternalServerError' ||
      getAsBooleanConfig(this.configService, 'LOG_ALL_ERROR') === true
    ) {
      this.nestLogger.error(logMessage, logError, 'GlobalExceptionFilter');
    }

    if (code === 'InternalServerError') {
      this.winstonLogger.errorRequest(transformed, logError);
    }

    if (statusCode === 500) {
      console.log(exception);
    }

    response.status(statusCode).json(transformed);
  }

  private processException(exception: unknown): {
    statusCode: number;
    message: string;
    code: string;
  } {
    if (exception instanceof HttpException) {
      return {
        statusCode: exception.getStatus(),
        message:
          exception.getResponse() instanceof Object
            ? (exception.getResponse() as any).message
            : exception.message,
        code: 'HttpException',
      };
    }

    if (
      exception instanceof QueryFailedError ||
      exception instanceof EntityNotFoundError ||
      exception instanceof CannotCreateEntityIdMapError
    ) {
      return {
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        message: exception.message,
        code: (exception as any).code || 'Error',
      };
    }

    if (exception instanceof Error) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: exception.message,
        code: 'InternalServerError',
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      code: 'InternalServerError',
    };
  }
}

export const GlobalResponseError = (
  statusCode: number,
  message: string | string[],
  code: string,
  request: Request,
): IResponseErrorRequest => ({
  statusCode,
  message,
  code,
  timestamp: new Date().toISOString(),
  path: request.url,
  method: request.method,
});
