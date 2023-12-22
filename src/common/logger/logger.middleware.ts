import { WinstonLogger } from '@Helper/logger/logger.service';
import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(private readonly logger: WinstonLogger) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = process.hrtime.bigint();

    const logDetails = {
      remoteAddr: req.ip,
      method: req.method,
      url: req.originalUrl,
      httpVersion: `HTTP/${req.httpVersion}`,
      userAgent: req.headers['user-agent'],
      referrer: req.headers['referer'] || req.headers['referrer'],
      auth: req.user
        ? {
            id: (req.user as any).id,
            username: (req.user as any).username,
            role: (req.user as any).role,
          }
        : 'Unauthenticated',
    };

    res.on('finish', () => {
      const diff = process.hrtime.bigint() - startTime;
      const responseTimeInMs = Number((Number(diff) / 1e6).toFixed(3));

      const logObject = {
        ...logDetails,
        status: res.statusCode,
        statusMessage: res.statusMessage,
        contentLength: res.get('content-length') || '0',
        responseTime: `${responseTimeInMs} ms`,
        timestamp: new Date().toISOString(),
      };

      this.logger.log(logObject);
    });

    next();
  }
}
