import { getAsStringConfig } from '@Helper/fn/get-as-config.helper';
import { NO_COMPRESSION_KEY } from '@Helper/no-compression.decorator';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import compression from 'compression';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';

@Injectable()
export class CompressionInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private readonly configService: ConfigService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const threshold = getAsStringConfig(
      this.configService,
      'COMPRESSION_THRESHOLD',
    );

    const noCompression = this.reflector.get<boolean>(
      NO_COMPRESSION_KEY,
      context.getHandler(),
    );

    if (noCompression) {
      return next.handle();
    } else {
      const http = context.switchToHttp();
      const request = http.getRequest<Request>();
      const response = http.getResponse<Response>();

      compression({ threshold: threshold })(request, response, (err?: any) => {
        if (err) {
          throw err;
        }
      });

      return next.handle();
    }
  }
}
