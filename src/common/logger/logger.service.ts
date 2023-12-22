import { Injectable, LoggerService } from '@nestjs/common';
import { Logger, createLogger, format } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

@Injectable()
export class WinstonLogger implements LoggerService {
  private readonly httpLogger: Logger;
  private readonly errorRequestLogger: Logger;
  private readonly errorLogger: Logger;

  constructor() {
    const dailyRotateHttpRequestTransport = new DailyRotateFile({
      filename: 'logs/request/access/%DATE%-access.log',
      datePattern: 'YYYY-MM-DD',
      format: format.combine(format.timestamp(), format.json()),
    });

    this.httpLogger = createLogger({
      format: format.combine(format.timestamp(), format.json()),
      transports: [dailyRotateHttpRequestTransport],
    });

    const dailyRotateErrorRequestTransport = new DailyRotateFile({
      filename: 'logs/request/error/%DATE%-error.log',
      datePattern: 'YYYY-MM-DD',
      format: format.combine(format.timestamp(), format.json()),
    });

    this.errorRequestLogger = createLogger({
      level: 'error',
      format: format.json(),
      transports: [dailyRotateErrorRequestTransport],
    });

    const dailyRotateErrorTransport = new DailyRotateFile({
      filename: 'logs/error/%DATE%-error.log',
      datePattern: 'YYYY-MM-DD',
      format: format.combine(format.timestamp(), format.json()),
    });

    this.errorLogger = createLogger({
      level: 'error',
      format: format.json(),
      transports: [dailyRotateErrorTransport],
    });
  }

  log(logObject: object) {
    this.httpLogger.info(logObject);
  }

  errorRequest(logObject: IResponseErrorRequest, trace?: string) {
    //console.error({ ...logObject, trace });
    this.errorRequestLogger.error({ ...logObject, trace });
  }

  error(logObject: IResponseError, trace?: string) {
    console.error({ ...logObject, trace });
    this.errorLogger.error({ ...logObject, trace });
  }

  warn(logObject: object) {
    this.httpLogger.warn(logObject);
  }

  debug(logObject: object) {
    this.httpLogger.debug(logObject);
  }

  verbose(logObject: object) {
    this.httpLogger.verbose(logObject);
  }

  async shutdown() {
    await this.httpLogger.end();
    await this.errorRequestLogger.end();
    await this.errorLogger.end();
    console.log('Close logs');
  }
}

export interface IResponseErrorRequest {
  statusCode: number;
  message: string | string[];
  code: string;
  timestamp: string;
  path: string;
  method: string;
}

export interface IResponseError {
  message: string | string[];
  code: string;
  timestamp: string;
}
