import { OmitType } from '@nestjs/swagger';
import { UserEntity } from '@Users/entities/user.entity';

export class ReturnAuthDto extends OmitType(UserEntity, ['password'] as const) {
  token: string;
}
