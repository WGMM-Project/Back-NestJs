import { UserTestManager } from '@Helper/test-utils/users-test-utils';
import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ToolsUser } from '../users.e2e-spec';

export function get_users_me(tools: ToolsUser) {
  describe('GET /users/me', () => {
    let app: INestApplication;
    let userManager: UserTestManager;

    beforeAll(() => {
      app = tools.app;
      userManager = tools.userManager;
    });

    // Test réussi - Récupération du profil de l'utilisateur connecté
    it('Success for admin user', async () => {
      return request(app.getHttpServer())
        .get('/users/me')
        .set(
          'Authorization',
          `Bearer ${userManager.findUserByKey('admin').token}`,
        )
        .expect(HttpStatus.OK)
        .then((response) => {
          expect(response.body).toEqual(
            expect.objectContaining({
              username: 'adminUser',
              // ...other expected user properties, but excluding password
            }),
          );
          expect(response.body).not.toHaveProperty('password');
        });
    });

    it('Success for normal user', async () => {
      return request(app.getHttpServer())
        .get('/users/me')
        .set(
          'Authorization',
          `Bearer ${userManager.findUserByKey('user').token}`,
        )
        .expect(HttpStatus.OK)
        .then((response) => {
          expect(response.body).toEqual(
            expect.objectContaining({
              username: 'normalUser',
              // ...other expected user properties, but excluding password
            }),
          );
          expect(response.body).not.toHaveProperty('password');
        });
    });

    // Test d'erreur - Pas de token fourni
    it('Unauthorized (no token)', () => {
      return request(app.getHttpServer())
        .get('/users/me')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });
}
