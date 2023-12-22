import { UserEntity } from '@Users/entities/user.entity';
import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesEnum } from './roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RolesEnum[]>(
      'roles',
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if ((user as UserEntity).role) {
      if (requiredRoles.includes((user as UserEntity).role)) {
        return true;
      }
      throw new HttpException(
        "You don't have the right to access this route.",
        HttpStatus.FORBIDDEN,
      );
    }
    throw new HttpException(
      "You don't have the right to access this route.",
      HttpStatus.FORBIDDEN,
    );
  }
}
