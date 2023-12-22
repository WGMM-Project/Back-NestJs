import { OmitType } from '@nestjs/swagger';
import { UserEntity } from '@Users/entities/user.entity';

export class ReturnUserWithoutPasswordDto extends OmitType(UserEntity, [
  'password',
] as const) {}
