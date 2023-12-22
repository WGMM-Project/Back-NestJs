import { ensureDatabaseExists } from '@Helper/check-database.helper';
import { UserTestManager } from '@Helper/test-utils/users-test-utils';
import { RolesEnum } from '@Roles/roles';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule, configGlobal } from '../../src/app.module';
import { delete_users_me } from './tests/delete-users-me.e2e-sub-spec';
import { delete_users_uuid } from './tests/delete-users-uuid.e2e-sub-spec';
import { get_users_group } from './tests/get-users-group.e2e-sub-spec';
import { get_users_me } from './tests/get-users-me.e2e-sub-spec';
import { get_users_uuid } from './tests/get-users-uuid.e2e-sub-spec';
import { get_users } from './tests/get-users.e2e-sub-spec';
import { post_users } from './tests/post-users.e2e-sub-spec';
import { put_users_me } from './tests/put-users-me.e2e-sub-spec';
import { put_users_uuid } from './tests/put-users-uuid.e2e-sub-spec';

export type ToolsUser = {
  app: INestApplication;
  userManager: UserTestManager;
};

describe('UsersController (e2e)', () => {
  let app: INestApplication;
  let userManager: UserTestManager;

  const tools: ToolsUser = {
    app: undefined,
    userManager: undefined,
  };

  beforeAll(async () => {
    await ensureDatabaseExists();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    const configService = app.get(ConfigService);
    await configGlobal(app);
    await app.init();

    userManager = new UserTestManager(app, configService);

    await userManager.loginMasterAdmin();

    await userManager.registerUser(
      {
        username: 'adminUser',
        password: 'adminPass',
        email: 'adminUser@gmail.com',
        role: RolesEnum.Admin,
        group: 'normalGroup',
      },
      false,
      'admin',
    );

    await userManager.registerUser(
      {
        username: 'normalUser',
        password: 'normalPass',
        email: 'normalUser@gmail.com',
        role: RolesEnum.User,
        group: 'normalGroup',
      },
      false,
      'user',
    );

    await userManager.registerUser(
      {
        username: 'notSameGroup',
        password: 'notSameGroup',
        email: 'notSameGroup@gmail.com',
        role: RolesEnum.User,
        group: 'notSameGroup',
      },
      false,
      'notSameGroup',
    );

    await userManager.registerUser(
      {
        username: 'noGroup',
        password: 'noGroupPass',
        email: 'noGroup@gmail.com',
        role: RolesEnum.User,
        group: 'noGroup',
      },
      false,
      'noGroup',
    );

    tools.userManager = userManager;
    tools.app = app;
  });

  beforeEach(async () => {});

  afterEach(async () => {
    await userManager.cleanupUsers();
  });

  afterAll(async () => {
    await userManager.markAllUsersForDeletionAndCleanup();
    console.log('Closing App');
    await app.close();
  });

  get_users_group(tools); // GET /users/group
  get_users_me(tools); // GET /users/me
  get_users(tools); // GET /users
  get_users_uuid(tools); // GET /users/:uuid
  post_users(tools); // POST /users
  put_users_me(tools); // PUT /users/me
  put_users_uuid(tools); // PUT /users/:uuid
  delete_users_me(tools); // DELETE /users/me
  delete_users_uuid(tools); // DELETE /users/:uuid
});
