import { RolesEnum } from './roles';
import { SetMetadata } from '@nestjs/common';

export const Roles = (...roles: string[]) => {
  if (roles) {
    roles.forEach((element) => {
      if (!(element in RolesEnum)) {
        console.warn(element + ' is not a role.');
      }
    });
  }
  return SetMetadata('roles', roles);
};
