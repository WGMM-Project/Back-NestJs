import { UserEntity } from '@/api/users/entities/user.entity';
import {
  createParamDecorator,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserEntity => {
    const request = ctx.switchToHttp().getRequest();

    if (!request.user) {
      console.warn('You need to add the decorator @Auth()');
      throw new HttpException(
        'You need to add the decorator @Auth()',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return request.user;
  },
);
