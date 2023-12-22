import { CommonModule } from '@Helper/common.module';
import { WinstonLogger } from '@Helper/logger/logger.service';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { unlink } from 'fs';
import { join } from 'path';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ErrorFileInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        const args = context.getArgs();
        if (args[0] && args[0]['file'] && args[0]['file'].path) {
          const logger = CommonModule.moduleRef.get(WinstonLogger, {
            strict: false,
          });
          const filePath = join(process.cwd(), args[0]['file'].path);
          unlink(filePath, (err) => {
            if (err) {
              const errorDetails = {
                message: `${filePath} wasn't deleted`,
                code: 'FILE_DELETE_ERROR',
                timestamp: new Date().toISOString(),
              };
              logger.error(errorDetails, err.stack);
            }
          });
        }
        return throwError(() => error);
      }),
    );
  }
}
