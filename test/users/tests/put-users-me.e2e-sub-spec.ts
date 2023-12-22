import {
  UserTestDTO,
  UserTestManager,
} from '@Helper/test-utils/users-test-utils';
import { RolesEnum } from '@Roles/roles';
import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ToolsUser } from '../users.e2e-spec';

export function put_users_me(tools: ToolsUser) {
  describe('PUT /users/me', () => {
    let user: UserTestDTO;

    let app: INestApplication;
    let userManager: UserTestManager;

    beforeAll(() => {
      app = tools.app;
      userManager = tools.userManager;
    });

    beforeEach(async () => {
      user = await userManager.randomRegister(
        RolesEnum.Admin,
        userManager.findUserByKey('admin').group,
      );
    });

    it('Success for admin user', async () => {
      const updatedData = {
        username: 'newadminemail',
        // Other fields to update...
      };

      return request(app.getHttpServer())
        .put('/users/me')
        .set('Authorization', `Bearer ${user.token}`)
        .send(updatedData)
        .expect(HttpStatus.OK)
        .then((response) => {
          expect(response.body).toEqual(
            expect.objectContaining({
              username: updatedData.username,
            }),
          );
          expect(response.body).not.toHaveProperty('password');
        });
    });

    it('Success for normal user', async () => {
      const updatedData = {
        username: 'newuseremail2',
      };

      return request(app.getHttpServer())
        .put('/users/me')
        .set('Authorization', `Bearer ${user.token}`)
        .send(updatedData)
        .expect(HttpStatus.OK)
        .then((response) => {
          expect(response.body).toEqual(
            expect.objectContaining({
              username: updatedData.username,
            }),
          );
          expect(response.body).not.toHaveProperty('password');
        });
    });

    // Test d'erreur - Pas de token fourni
    it('Unauthorized (no token)', () => {
      return request(app.getHttpServer())
        .put('/users/me')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('UNPROCESSABLE_ENTITY (username already exists)', async () => {
      const updatedData = {
        username: userManager.findUserByKey('admin').username,
      };

      return request(app.getHttpServer())
        .put('/users/me')
        .set('Authorization', `Bearer ${user.token}`)
        .send(updatedData)
        .expect(HttpStatus.UNPROCESSABLE_ENTITY);
    });

    it('Should not change group when updating user details', async () => {
      const originalGroup = user.group;
      const updatedData = { username: 'newUsername', group: 'newGroup' };

      const response = await request(app.getHttpServer())
        .put('/users/me')
        .set('Authorization', `Bearer ${user.token}`)
        .send(updatedData)
        .expect(HttpStatus.OK);

      expect(response.body.group).toEqual(originalGroup);
    });
  });
}
