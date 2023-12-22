import { UserTestManager } from '@Helper/test-utils/users-test-utils';
import { RolesEnum } from '@Roles/roles';
import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ToolsUser } from '../users.e2e-spec';

export function post_users(tools: ToolsUser) {
  describe('POST /users', () => {
    let app: INestApplication;
    let userManager: UserTestManager;

    beforeAll(() => {
      app = tools.app;
      userManager = tools.userManager;
    });

    // Test réussi - Création d'un nouvel utilisateur
    it('Success', async () => {
      const newUser = {
        username: 'newUsername2',
        password: 'newPassword2',
        email: 'newuser2@example.com',
        role: RolesEnum.User,
      };

      return request(app.getHttpServer())
        .post('/users')
        .set(
          'Authorization',
          `Bearer ${userManager.findUserByKey('admin').token}`,
        ) // Assuming an admin token is needed to create a user
        .send(newUser)
        .expect(HttpStatus.CREATED)
        .then((response) => {
          expect(response.body).toEqual(
            expect.objectContaining({
              id: expect.any(String),
              username: newUser.username,
              email: newUser.email,
              group: userManager.findUserByKey('admin').group,
              // The response should not contain password
            }),
          );
          expect(response.body).not.toHaveProperty('password');
          userManager.storeUser({
            ...response.body,
            password: newUser.password,
            deleteAfterTest: true,
          });
        });
    });

    // Test réussi - Création d'un nouvel utilisateur avec un groupe spécifié
    it('Success with group specified (cannot choose group, same as admin)', async () => {
      const adminUser = userManager.findUserByKey('admin');
      const newUser = {
        username: 'newUsernameWithGroup',
        password: 'newPasswordWithGroup',
        email: 'newuserwithgroup@example.com',
        role: RolesEnum.User,
        group: 'someGroup', // Groupe spécifié ici
      };

      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminUser.token}`)
        .send(newUser)
        .expect(HttpStatus.CREATED)
        .then((response) => {
          expect(response.body).toEqual(
            expect.objectContaining({
              id: expect.any(String),
              username: newUser.username,
              email: newUser.email,
              group: adminUser.group, // S'assurer que le groupe de l'utilisateur créé est celui de l'admin
              // Les autres champs attendus, sans mot de passe bien sûr
            }),
          );
          expect(response.body).not.toHaveProperty('password');
          userManager.storeUser({
            ...response.body,
            password: newUser.password,
            deleteAfterTest: true,
          });
        });
    });

    // Test d'erreur - Création d'un utilisateur avec un email déjà existant
    it('UNPROCESSABLE_ENTITY (duplicate email)', async () => {
      const newUser = {
        username: 'newPassword',
        password: 'newPassword',
        email: userManager.findUserByKey('user').email,
        role: RolesEnum.User,
      };

      return request(app.getHttpServer())
        .post('/users')
        .set(
          'Authorization',
          `Bearer ${userManager.findUserByKey('admin').token}`,
        )
        .send(newUser)
        .expect(HttpStatus.UNPROCESSABLE_ENTITY);
    });

    // Test d'erreur - Création d'un utilisateur avec des données de validation manquantes
    it('Bad Request (validation error)', async () => {
      return request(app.getHttpServer())
        .post('/users')
        .set(
          'Authorization',
          `Bearer ${userManager.findUserByKey('admin').token}`,
        )
        .send({
          username: '', // Empty username should trigger a validation error
          password: 'password',
          email: 'invalidemail', // Invalid email format should also trigger a validation error
          // Omit any other required fields to trigger validation errors
        })
        .expect(HttpStatus.BAD_REQUEST);
    });

    // Test d'erreur - Création d'un utilisateur sans token d'authentification
    it('Unauthorized (no token)', async () => {
      return request(app.getHttpServer())
        .post('/users')
        .send({
          username: 'newUserNoToken',
          password: 'password',
          email: 'newusernotoken@example.com',
          // Add any other required fields
        })
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });
}
