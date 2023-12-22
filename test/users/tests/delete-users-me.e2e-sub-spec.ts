import {
  UserTestDTO,
  UserTestManager,
} from '@Helper/test-utils/users-test-utils';
import { RolesEnum } from '@Roles/roles';
import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ToolsUser } from '../users.e2e-spec';

export function delete_users_me(tools: ToolsUser) {
  describe('DELETE /users/me', () => {
    let user: UserTestDTO;

    let app: INestApplication;
    let userManager: UserTestManager;

    beforeAll(() => {
      app = tools.app;
      userManager = tools.userManager;
    });

    beforeEach(async () => {
      user = await userManager.randomRegister(RolesEnum.Admin);
    });

    // Test réussi - Suppression du compte utilisateur par l'utilisateur lui-même
    it('Success', async () => {
      return request(app.getHttpServer())
        .delete('/users/me')
        .set('Authorization', `Bearer ${user.token}`)
        .expect(HttpStatus.OK)
        .then(() => {
          delete userManager.users[user.id];
        });
    });

    // Test d'erreur - Suppression du compte utilisateur sans authentification
    it('Unauthorized (no token)', async () => {
      return request(app.getHttpServer())
        .delete('/users/me')
        .expect(HttpStatus.UNAUTHORIZED); // 401 if the user is not authenticated
    });

    // Test d'erreur - Suppression du compte utilisateur avec un token invalide ou expiré
    it('Unauthorized (invalid or expired token)', async () => {
      const invalidToken = 'some.invalid.token';

      return request(app.getHttpServer())
        .delete('/users/me')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(HttpStatus.UNAUTHORIZED); // 401 if the token is invalid or expired
    });
  });
}
