import { UserTestManager } from '@Helper/test-utils/users-test-utils';
import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ToolsUser } from '../users.e2e-spec';

export function get_users(tools: ToolsUser) {
  describe('GET /users', () => {
    let app: INestApplication;
    let userManager: UserTestManager;

    beforeAll(() => {
      app = tools.app;
      userManager = tools.userManager;
    });

    // Test réussi - Récupération de tous les utilisateurs (pour les admin)
    it('Success (admin token) - Users from the same group', async () => {
      return request(app.getHttpServer())
        .get('/users')
        .set(
          'Authorization',
          `Bearer ${userManager.findUserByKey('admin').token}`,
        ) // Utilisez un jeton d'administration valide ici
        .expect(HttpStatus.OK)
        .then((response) => {
          expect(Array.isArray(response.body)).toBeTruthy();
          expect(response.body.length).toBeGreaterThan(0); // Assurez-vous qu'au moins un utilisateur est retourné
          response.body.forEach((user) => {
            expect(user).toEqual(
              expect.objectContaining({
                id: expect.any(String),
                username: expect.any(String),
                group: expect.any(String),
                // D'autres champs attendus de vos utilisateurs, sans mot de passe bien sûr
              }),
            );
            expect(user.group).toBe(userManager.findUserByKey('admin').group);
            expect(user).not.toHaveProperty('password');
          });
        });
    });

    // Test d'erreur - Pas de token fourni
    it('Unauthorized (no token)', () => {
      return request(app.getHttpServer())
        .get('/users')
        .expect(HttpStatus.UNAUTHORIZED); // 401 Unauthorized si aucun token n'est fourni
    });

    // Test d'erreur - Token invalide ou d'un utilisateur non admin
    it('Forbidden (token not admin)', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set(
          'Authorization',
          `Bearer ${userManager.findUserByKey('user').token}`,
        ) // Utilisez un jeton utilisateur qui n'est pas un admin
        .expect(HttpStatus.FORBIDDEN); // 403 Forbidden si l'utilisateur n'est pas autorisé à voir tous les utilisateurs
    });
  });
}
