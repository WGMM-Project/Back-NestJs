import {
  UserTestDTO,
  UserTestManager,
} from '@Helper/test-utils/users-test-utils';
import { RolesEnum } from '@Roles/roles';
import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ToolsUser } from '../users.e2e-spec';

export function put_users_uuid(tools: ToolsUser) {
  describe('PUT /users/:uuid', () => {
    let userUser: UserTestDTO;
    let userAdmin: UserTestDTO;

    let userNotSameGroup: UserTestDTO;
    let userNoGroup: UserTestDTO;

    let app: INestApplication;
    let userManager: UserTestManager;

    beforeAll(() => {
      app = tools.app;
      userManager = tools.userManager;
    });

    beforeEach(async () => {
      userUser = await userManager.randomRegister(
        RolesEnum.User,
        userManager.findUserByKey('admin').group,
      );
      userAdmin = await userManager.randomRegister(
        RolesEnum.Admin,
        userManager.findUserByKey('admin').group,
      );

      userNotSameGroup = await userManager.randomRegister(
        RolesEnum.User,
        'lol',
      );

      userNoGroup = await userManager.randomRegister(RolesEnum.User);
    });

    // Test réussi - Mise à jour d'un utilisateur par un admin
    it('Success by Admin', async () => {
      const updateData = {
        username: 'updatedUserWork',
      };

      return request(app.getHttpServer())
        .put(`/users/${userUser.id}`) // Assuming 'userId' is the ID of the user to be updated
        .set(
          'Authorization',
          `Bearer ${userManager.findUserByKey('admin').token}`,
        ) // Admin token for authorization
        .send(updateData)
        .expect(HttpStatus.OK)
        .then((response) => {
          expect(response.body).toEqual(
            expect.objectContaining({
              id: userUser.id,
              username: updateData.username,
              // Other fields that should be in the response
            }),
          );
          expect(response.body).not.toHaveProperty('password');
        });
    });

    // Test réussi - Mise à jour d'un utilisateur par lui-même
    it('Success by Self (only admin)', async () => {
      const updateData = {
        username: 'selfUpdateUserWork',
      };

      return request(app.getHttpServer())
        .put(`/users/${userAdmin.id}`) // 'userId' is the ID of the user to be updated
        .set('Authorization', `Bearer ${userAdmin.token}`) // User token for self-update
        .send(updateData)
        .expect(HttpStatus.OK)
        .then((response) => {
          expect(response.body).toEqual(
            expect.objectContaining({
              id: userAdmin.id,
              username: updateData.username,
              // Other fields that should be in the response
            }),
          );
          expect(response.body).not.toHaveProperty('password');
        });
    });

    // Test - Essayer de changer le groupe mais échouer
    it('Success but group unchanged', async () => {
      const originalGroup = userUser.group;
      const updateData = { username: 'updatedUser', group: 'newGroup' };

      return request(app.getHttpServer())
        .put(`/users/${userUser.id}`)
        .set('Authorization', `Bearer ${userAdmin.token}`)
        .send(updateData)
        .expect(HttpStatus.OK)
        .then((response) => {
          expect(response.body.group).toBe(originalGroup);
          expect(response.body.username).toBe(updateData.username);
          expect(response.body).not.toHaveProperty('password');
        });
    });

    // Test d'erreur - Tentative de mise à jour d'un utilisateur avec un uuid non existant
    it('UNPROCESSABLE_ENTITY (invalid uuid)', () => {
      return request(app.getHttpServer())
        .put('/users/non-existing-uuid')
        .set(
          'Authorization',
          `Bearer ${userManager.findUserByKey('admin').token}`,
        )
        .send({
          username: 'doesNotExist',
          email: 'doesnotexist@example.com',
          // Other fields you want to update
        })
        .expect(HttpStatus.UNPROCESSABLE_ENTITY);
    });

    // Test d'erreur - Mise à jour d'un utilisateur sans autorisation
    it('Unauthorized (no token)', () => {
      return request(app.getHttpServer())
        .put(`/users/${userManager.findUserByKey('admin').id}`)
        .send({
          username: 'noAuthToken',
          email: 'noauth@example.com',
          // Other fields you want to update
        })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    // Test d'erreur - Mise à jour d'un utilisateur avec des données invalides
    it('Bad Request (invalid data)', async () => {
      return request(app.getHttpServer())
        .put(`/users/${userUser.id}`)
        .set(
          'Authorization',
          `Bearer ${userManager.findUserByKey('admin').token}`,
        )
        .send({
          username: '', // Empty username should fail validation
          email: 'not-an-email', // Invalid email should fail validation
          // Other fields with invalid data
        })
        .expect(HttpStatus.BAD_REQUEST);
    });

    // Test d'erreur - Mise à jour d'un utilisateur d'un autre groupe
    it('Forbidden - Update user from another group', async () => {
      const updateData = { username: 'updatedUsernameOtherGroup' };

      return request(app.getHttpServer())
        .put(`/users/${userNotSameGroup.id}`)
        .set('Authorization', `Bearer ${userAdmin.token}`)
        .send(updateData)
        .expect(HttpStatus.FORBIDDEN);
    });

    // Test d'erreur - Mise à jour d'un utilisateur sans groupe
    it('Forbidden - Update user with no group', async () => {
      const updateData = { username: 'updatedUsernameNoGroup' };

      return request(app.getHttpServer())
        .put(`/users/${userNoGroup.id}`)
        .set('Authorization', `Bearer ${userAdmin.token}`)
        .send(updateData)
        .expect(HttpStatus.FORBIDDEN);
    });
  });
}
