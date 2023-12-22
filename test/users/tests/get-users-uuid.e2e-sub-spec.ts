import { UserTestManager } from '@Helper/test-utils/users-test-utils';
import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ToolsUser } from '../users.e2e-spec';

export function get_users_uuid(tools: ToolsUser) {
  describe('GET /users/:uuid', () => {
    let app: INestApplication;
    let userManager: UserTestManager;

    beforeAll(() => {
      app = tools.app;
      userManager = tools.userManager;
    });

    // Test réussi - Récupération d'un utilisateur spécifique par UUID
    it('Success', async () => {
      const validUuid = userManager.findUserByKey('user').id;

      return request(app.getHttpServer())
        .get(`/users/${validUuid}`)
        .set(
          'Authorization',
          `Bearer ${userManager.findUserByKey('admin').token}`,
        )
        .expect(HttpStatus.OK)
        .then((response) => {
          expect(response.body).toEqual(
            expect.objectContaining({
              id: validUuid,
              username: expect.any(String),
              group: userManager.findUserByKey('admin').group,
              // Include other fields that are expected in the response
            }),
          );
          expect(response.body).not.toHaveProperty('password');
        });
    });

    // Test d'erreur - UUID invalide (non trouvé)
    it('Not Found (invalid UUID)', async () => {
      const invalidUuid = 'non-existent-uuid';

      return request(app.getHttpServer())
        .get(`/users/${invalidUuid}`)
        .set(
          'Authorization',
          `Bearer ${userManager.findUserByKey('admin').token}`,
        )
        .expect(HttpStatus.UNPROCESSABLE_ENTITY);
    });

    // Test d'erreur - Accès non autorisé sans token
    it('Unauthorized (no token)', async () => {
      const validUuid = 'some-valid-uuid'; // A valid user UUID

      return request(app.getHttpServer())
        .get(`/users/${validUuid}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    // Test d'erreur - Accès interdit avec token utilisateur non admin (si l'accès est restreint aux admins)
    it('Forbidden (token not admin)', async () => {
      return request(app.getHttpServer())
        .get(`/users/${userManager.findUserByKey('user').id}`)
        .set(
          'Authorization',
          `Bearer ${userManager.findUserByKey('user').token}`,
        ) // Assuming userToken does not have admin privileges
        .expect(HttpStatus.FORBIDDEN);
    });

    // Test d'erreur - Tentative de récupérer un utilisateur d'un autre groupe
    it('Forbidden - Attempt to access user from another group', async () => {
      return request(app.getHttpServer())
        .get(`/users/${userManager.findUserByKey('notSameGroup').id}`)
        .set(
          'Authorization',
          `Bearer ${userManager.findUserByKey('admin').token}`,
        )
        .expect(HttpStatus.FORBIDDEN);
    });

    // Test d'erreur - Tentative de récupérer un utilisateur sans groupe
    it('Forbidden - Attempt to access user without a group', async () => {
      return request(app.getHttpServer())
        .get(`/users/${userManager.findUserByKey('noGroup').id}`)
        .set(
          'Authorization',
          `Bearer ${userManager.findUserByKey('admin').token}`,
        )
        .expect(HttpStatus.FORBIDDEN);
    });
  });
}
