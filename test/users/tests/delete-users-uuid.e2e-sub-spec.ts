import {
  UserTestDTO,
  UserTestManager,
} from '@Helper/test-utils/users-test-utils';
import { RolesEnum } from '@Roles/roles';
import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ToolsUser } from '../users.e2e-spec';

export function delete_users_uuid(tools: ToolsUser) {
  describe('DELETE /users/:uuid', () => {
    let user: UserTestDTO;
    let adminUser: UserTestDTO;

    let userNotSameGroup: UserTestDTO;
    let userNoGroup: UserTestDTO;

    let app: INestApplication;
    let userManager: UserTestManager;

    beforeAll(() => {
      app = tools.app;
      userManager = tools.userManager;
    });

    beforeEach(async () => {
      user = await userManager.randomRegister(
        RolesEnum.User,
        userManager.findUserByKey('admin').group,
      );
      adminUser = await userManager.randomRegister(
        RolesEnum.Admin,
        userManager.findUserByKey('admin').group,
      );

      userNotSameGroup = await userManager.randomRegister(
        RolesEnum.User,
        'lol',
      );

      userNoGroup = await userManager.randomRegister(RolesEnum.User);
    });

    // Test réussi - Suppression d'un utilisateur par un admin
    it('Success by Admin', async () => {
      return request(app.getHttpServer())
        .delete(`/users/${user.id}`) // Assuming 'userId' is the ID of the user to be deleted
        .set(
          'Authorization',
          `Bearer ${userManager.findUserByKey('admin').token}`,
        ) // Admin token for authorization
        .expect(HttpStatus.OK)
        .then(() => {
          delete userManager.users[user.id];
        });
    });

    it('FORBIDDEN (admin cannot delete another admin)', async () => {
      return request(app.getHttpServer())
        .delete(`/users/${adminUser.id}`)
        .set(
          'Authorization',
          `Bearer ${userManager.findUserByKey('admin').token}`,
        ) // Admin token for authorization
        .expect(HttpStatus.FORBIDDEN);
    });

    // Test d'erreur - Tentative de suppression d'un utilisateur sans être authentifié
    it('Unauthorized (no token)', async () => {
      return request(app.getHttpServer())
        .delete(`/users/${user.id}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    // Test d'erreur - Tentative de suppression d'un utilisateur avec un token utilisateur non admin
    it('Forbidden (token not admin)', async () => {
      return request(app.getHttpServer())
        .delete(`/users/${user.id}`)
        .set(
          'Authorization',
          `Bearer ${userManager.findUserByKey('user').token}`,
        ) // User token for a non-admin
        .expect(HttpStatus.FORBIDDEN);
    });

    // Test d'erreur - Tentative de suppression d'un utilisateur avec un uuid non existant
    it('UNPROCESSABLE_ENTITY (invalid uuid)', () => {
      return request(app.getHttpServer())
        .delete('/users/non-existing-uuid')
        .set(
          'Authorization',
          `Bearer ${userManager.findUserByKey('admin').token}`,
        ) // Admin token for authorization
        .expect(HttpStatus.UNPROCESSABLE_ENTITY);
    });

    // Test d'erreur - Tentative de suppression d'un utilisateur d'un autre groupe
    it('Forbidden - Delete user from another group', async () => {
      return request(app.getHttpServer())
        .delete(`/users/${userNotSameGroup.id}`)
        .set(
          'Authorization',
          `Bearer ${userManager.findUserByKey('admin').token}`,
        )
        .expect(HttpStatus.FORBIDDEN);
    });

    // Test d'erreur - Tentative de suppression d'un utilisateur sans groupe
    it('Forbidden - Delete user with no group', async () => {
      return request(app.getHttpServer())
        .delete(`/users/${userNoGroup.id}`)
        .set(
          'Authorization',
          `Bearer ${userManager.findUserByKey('admin').token}`,
        )
        .expect(HttpStatus.FORBIDDEN);
    });
  });
}
