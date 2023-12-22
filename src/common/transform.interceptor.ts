import { NO_TRANSFORM_KEY } from '@Helper/no-transform.decorator';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { instanceToPlain } from 'class-transformer';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const noTransform = this.reflector.get<boolean>(
      NO_TRANSFORM_KEY,
      context.getHandler(),
    );
    if (noTransform) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        const result = instanceToPlain(data);
        return result;
      }),
    );
  }
}
