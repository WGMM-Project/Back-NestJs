import {
  UserTestManager,
  randomString,
} from '@Helper/test-utils/users-test-utils';
import { RolesEnum } from '@Roles/roles';
import { INestApplication } from '@nestjs/common';

export enum DefaultUserCommon {
  Admin = 'admin',
  User = 'user',
  User2 = 'user2',
  UserNoGroup = 'userNoGroup',
  UserNotSameGroup = 'userNotSameGroup',
}

export type ToolsCommonType<S> = {
  app: INestApplication;
  userManager: UserTestManager;
  service: S;
};

export async function initUser(userManager: UserTestManager) {
  await userManager.loginMasterAdmin();

  const oneGroup = randomString(20);
  const secondGroup = randomString(20);

  await userManager.randomRegister(RolesEnum.Admin, oneGroup, false, 'admin');

  await userManager.randomRegister(RolesEnum.User, oneGroup, false, 'user');

  await userManager.randomRegister(RolesEnum.User, oneGroup, false, 'user2');

  await userManager.randomRegister(
    RolesEnum.User,
    secondGroup,
    false,
    'userNotSameGroup',
  );

  await userManager.randomRegister(
    RolesEnum.User,
    undefined,
    false,
    'userNoGroup',
  );
}
