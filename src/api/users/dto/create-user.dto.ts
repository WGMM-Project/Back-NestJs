import { UserEntity } from '@Users/entities/user.entity';
import { PickType } from '@nestjs/swagger';

export class CreateUserDto extends PickType(UserEntity, [
  'password',
  'email',
  'username',
] as const) {}

export class CreateUserAdminDto extends PickType(UserEntity, [
  'password',
  'email',
  'username',
  'role',
] as const) {}
