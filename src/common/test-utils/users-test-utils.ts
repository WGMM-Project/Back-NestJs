import { getAsStringConfig } from '@Helper/fn/get-as-config.helper';
import { RolesEnum } from '@Roles/roles';
import { UsersService } from '@Users/users.service';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import request from 'supertest';

export interface RegisterUserTestDTO {
  username: string;
  password: string;
  email: string;
  role: RolesEnum;
}

export interface UserTestDTO {
  key?: string;
  id: string;
  username: string;
  password: string;
  email: string;
  deleteAfterTest: boolean;
  role: RolesEnum;
  token?: string;
}

export interface LoginUserTestDTO {
  username: string;
  password: string;
}

// Helper function to generate a random string
export function randomString(length: number): string {
  return randomBytes(length).toString('hex').slice(0, length);
}

// Helper function to generate a random email
function randomEmail(): string {
  const prefix = randomString(5);
  const domain = randomString(5);
  return `${prefix}@${domain}.com`;
}

export class UserTestManager {
  private app: INestApplication;
  private configService: ConfigService;
  public users: Record<string, UserTestDTO> = {};
  public tokenMasterAdmin: string;
  public usersService: UsersService;

  constructor(app: INestApplication, config: ConfigService) {
    this.app = app;
    this.configService = config;
    this.usersService = app.get<UsersService>(UsersService);
  }

  async randomRegister(
    role: RolesEnum = RolesEnum.User,
    deleteAfterTest: boolean = true,
    key?: string,
  ): Promise<UserTestDTO> {
    const randomUserData: RegisterUserTestDTO = {
      username: randomString(10),
      password: randomString(10),
      email: randomEmail(),
      role: role,
    };

    return this.registerUser(randomUserData, deleteAfterTest, key);
  }

  async registerUser(
    userData: RegisterUserTestDTO,
    deleteUser: boolean = false,
    key?: string,
  ): Promise<UserTestDTO> {
    if (key && this.users[key]) {
      return this.users[key];
    }

    let user;

    try {
      user = await this.usersService.createUser(userData);
    } catch (error) {
      throw new Error(
        'User registration failed: ' +
          JSON.stringify(userData) +
          ' ' +
          error.message,
      );
    }

    const token = await this.loginUser({
      username: userData.username,
      password: userData.password,
    });

    const newUser: UserTestDTO = {
      key: key,
      ...user,
      password: userData.password,
      deleteAfterTest: deleteUser,
      token: token,
    };

    const dictionaryKey = key || user.id;
    this.users[dictionaryKey] = newUser;
    return newUser;
  }

  storeUser(user: UserTestDTO) {
    const dictionaryKey = user.key || user.id;
    if (dictionaryKey) {
      this.users[dictionaryKey] = user;
    }
  }

  findUserByKey(key: string): UserTestDTO | null {
    const find = this.users[key];
    if (!find) {
      return null;
    }
    return find;
  }

  cleanUpChangeByKey(key: string, deleteUser: boolean) {
    if (this.users[key]) {
      this.users[key].deleteAfterTest = deleteUser;
    }
  }

  deleteUserFromDictionary(key: string): void {
    if (this.users[key]) {
      delete this.users[key];
    }
  }

  async loginMasterAdmin(): Promise<{ uuid: string; token: string }> {
    const adminUsername = getAsStringConfig(
      this.configService,
      'FIRST_USER_USERNAME',
    );
    const adminPassword = getAsStringConfig(
      this.configService,
      'FIRST_USER_PASSWORD',
    );

    if (!adminUsername || !adminPassword) {
      throw new Error('Admin credentials are not set in the configuration');
    }

    const response = await request(this.app.getHttpServer())
      .post('/auth/login')
      .send({
        username: adminUsername,
        password: adminPassword,
      });

    if (response.status !== 201 || !response.body.token) {
      throw new Error('Admin login failed: ' + JSON.stringify(response.body));
    }

    this.tokenMasterAdmin = response.body.token;

    return;
  }

  async loginUser(userData: LoginUserTestDTO): Promise<string> {
    const response = await request(this.app.getHttpServer())
      .post('/auth/login')
      .send(userData);

    if (response.status === 201) {
      return response.body.token;
    } else {
      throw new Error('User login failed: ' + JSON.stringify(response.body));
    }
  }

  async deleteUser(token: string): Promise<void> {
    // Assume user ID and username are the same for simplicity
    const response = await request(this.app.getHttpServer())
      .delete(`/users/me`)
      .set('Authorization', `Bearer ${token}`);

    if (response.status !== 200) {
      throw new Error('User deletion failed: ' + JSON.stringify(response.body));
    }
  }

  async markAllUsersForDeletionAndCleanup(): Promise<void> {
    // Mark all users' deleteAfterTest property to true.
    for (const key in this.users) {
      this.users[key].deleteAfterTest = true;
    }

    // Perform cleanup after marking.
    await this.cleanupUsers();
  }

  async getUserById(userId: string): Promise<UserTestDTO> {
    const user = await this.usersService.findOne([], { id: userId });

    if (!user) {
      throw new Error('User with id ' + userId + ' does not exist');
    }

    return user as unknown as UserTestDTO;
  }

  async cleanupUsers(): Promise<void> {
    const list = Object.values(this.users).filter(
      (user) => user.deleteAfterTest,
    );
    for (const user of list) {
      const dictionaryKey = user.key || user.id;

      // First, check if the user exists by attempting to get the user data
      let userData: UserTestDTO | undefined;
      try {
        userData = await this.getUserById(this.users[dictionaryKey].id);
      } catch (error) {
        // console.log(`User ${dictionaryKey} retrieval failed: ${error}`);
        delete this.users[dictionaryKey];
        continue; // If retrieval fails, skip further cleanup for this user.
      }

      // If user data is returned, it means user exists, proceed with login and deletion
      if (userData) {
        let token = user.token;

        if (!token) {
          try {
            token = await this.loginUser({
              username: user.username,
              password: user.password,
            });
          } catch (error) {
            console.log(`Login failed for user ${user.username}: ${error}`);
            delete this.users[dictionaryKey];
            continue; // Skip deleting the user from the backend.
          }
        }

        try {
          await this.deleteUser(token);
          delete this.users[dictionaryKey];
        } catch (error) {
          console.log(`Deletion failed for user ${user.username}: ${error}`);
          delete this.users[dictionaryKey];
        }
      } else {
        delete this.users[dictionaryKey];
      }
    }
  }
}
