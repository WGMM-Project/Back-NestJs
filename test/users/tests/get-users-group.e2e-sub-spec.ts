import { UserTestManager } from '@Helper/test-utils/users-test-utils';
import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ToolsUser } from '../users.e2e-spec';

export function get_users_group(tools: ToolsUser) {
  describe('GET /users/group', () => {
    let app: INestApplication;
    let userManager: UserTestManager;

    beforeAll(() => {
      app = tools.app;
      userManager = tools.userManager;
    });

    // Test réussi - Récupération des utilisateurs du même groupe
    it('Success - Users from the same group', async () => {
      const adminUser = userManager.findUserByKey('admin');
      const response = await request(app.getHttpServer())
        .get('/users/group')
        .set('Authorization', `Bearer ${adminUser.token}`); // Set the Authorization header with the token

      expect(response.status).toBe(HttpStatus.OK);
      expect(Array.isArray(response.body)).toBeTruthy();

      response.body.forEach((userObj) => {
        // Vérifiez que chaque objet utilisateur contient 'username' et 'group'
        expect(userObj).toEqual(
          expect.objectContaining({
            username: expect.any(String),
            group: expect.any(String),
          }),
        );
        // Assurez-vous que les utilisateurs sont dans le même groupe que l'administrateur
        expect(userObj.group).toBe(adminUser.group);

        // Vérifiez que chaque objet utilisateur ne contient pas 'password'
        expect(userObj).not.toHaveProperty('password');
      });
      return response;
    });

    // Test d'erreur - Pas de token fourni
    it('Unauthorized (no token)', () => {
      return request(app.getHttpServer()).get('/users/group').expect(401);
    });

    // Test d'erreur - Token invalide
    it('Forbidden (token not admin)', () => {
      return request(app.getHttpServer())
        .get('/users/group')
        .set(
          'Authorization',
          `Bearer ${userManager.findUserByKey('user').token}`,
        )
        .expect(403);
    });
  });
}
