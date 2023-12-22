import { UserEntity } from '@/api/users/entities/user.entity';
import { OMITTED_FIELDS } from '@Helper/omitted-field.helper';
import { OmitType, PartialType } from '@nestjs/swagger';

export class UpdateUserDto extends PartialType(
  OmitType(UserEntity, [
    'password',
    'email',
    'role',
    'group',
    ...OMITTED_FIELDS,
  ] as const),
) {}

export class UpdateUserAdminDto extends PartialType(
  OmitType(UserEntity, [...OMITTED_FIELDS] as const),
) {}
