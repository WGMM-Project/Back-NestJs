import { CRUDService } from '@Helper/crud.service';
import {
  getAsEnumConfig,
  getAsStringConfig,
} from '@Helper/fn/get-as-config.helper';
import { WinstonLogger } from '@Helper/logger/logger.service';
import { RolesEnum } from '@Roles/roles';
import { UpdateUserDto } from '@Users/dto/update-user.dto';
import { UsersCacheService } from '@Users/users.caches.service';
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityTarget,
  FindOptionsSelect,
  InsertResult,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { AuthHelper } from './auth/other/auth.helper';
import { CreateUserAdminDto } from './dto/create-user.dto';
import { UserEntity } from './entities/user.entity';

function basicCreate<Entity>(
  repository: Repository<Entity>,
  entityTarget: EntityTarget<Entity>,
  createSet: QueryDeepPartialEntity<Entity>,
): Promise<Entity> {
  return repository
    .createQueryBuilder()
    .insert()
    .into(entityTarget)
    .values([createSet])
    .returning('*')
    .execute()
    .then((result: InsertResult) => {
      return result.raw[0];
    });
}

@Injectable()
export class UsersService extends CRUDService<UserEntity> {
  constructor(
    @InjectRepository(UserEntity)
    protected readonly usersRepository: Repository<UserEntity>,
    private configService: ConfigService,
    @Inject(AuthHelper)
    private readonly helper: AuthHelper,
    private readonly usersCacheService: UsersCacheService,
    private readonly logger: WinstonLogger,
  ) {
    super(usersRepository, 'User');
    this.defaultOrder = {
      created_at: 'DESC',
    };
    this.createFirstUser().catch((error) => {
      const errorDetails = {
        message: 'Error creating the first user: ' + error.message,
        code: 'FIRST_USER_ERROR',
        timestamp: new Date().toISOString(),
      };
      this.logger.error(errorDetails, error.stack);
    });
  }

  userEntities: string[] = this.repository.metadata.ownColumns.map(
    (column) => column.propertyName,
  );

  private async createFirstUser(): Promise<void> {
    try {
      const username = getAsStringConfig(
        this.configService,
        'FIRST_USER_USERNAME',
      );
      const password = getAsStringConfig(
        this.configService,
        'FIRST_USER_PASSWORD',
      );
      const email = getAsStringConfig(this.configService, 'FIRST_USER_EMAIL');
      const role = getAsEnumConfig(
        this.configService,
        'FIRST_USER_ROLE',
        RolesEnum,
      );

      if (!username || !password || !email || !role) {
        throw new Error(
          "First user's details are not fully set in the configuration.",
        );
      }

      const hashedPassword = this.helper.encodePassword(password);

      const firstUser: Partial<UserEntity> = {
        username: username,
        password: hashedPassword,
        email: email,
        role: role,
      };

      await basicCreate(this.usersRepository, UserEntity, firstUser);
    } catch (reason) {
      if (
        reason instanceof QueryFailedError &&
        reason.message.includes(
          'duplicate key value violates unique constraint',
        )
      ) {
        console.log('First user already exists.');
      } else {
        const errorDetails = {
          message: 'Error creating the first user: ' + reason.message,
          code: 'FIRST_USER_ERROR',
          timestamp: new Date().toISOString(),
        };
        this.logger.error(errorDetails, reason.stack);
      }
    }
  }

  async findOneWithGroup(uuid: string): Promise<UserEntity> {
    const find = await this.findOne([], { id: uuid });

    if (!find) {
      throw new HttpException(
        'User with id ' + uuid + ' does not exist',
        HttpStatus.NOT_FOUND,
      );
    }
    return find;
  }

  async createAdmin(createUserDto: CreateUserAdminDto): Promise<UserEntity> {
    const hashedPassword = this.helper.encodePassword(createUserDto.password);
    return this.create({
      ...createUserDto,
      password: hashedPassword,
    });
  }

  async createUser(createUserDto: Partial<UserEntity>): Promise<UserEntity> {
    const hashedPassword = this.helper.encodePassword(createUserDto.password);
    return this.create({ ...createUserDto, password: hashedPassword });
  }

  async findOneUserWithPassword(
    usernameOrEmail: string,
  ): Promise<UserEntity | undefined> {
    return this.repository.findOne({
      where: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
      select: this.userEntities as FindOptionsSelect<UserEntity>,
    });
  }

  async updateService(
    id: string,
    updateUserDto: UpdateUserDto,
    user?: UserEntity,
  ) {
    if (user) await this.idAuthorize(id, user);
    const userUpdate = await this.update(id, updateUserDto);
    try {
      await this.usersCacheService.set({ id: id }, userUpdate);
    } catch (error) {
      const errorDetails = {
        message: 'User cache update: ' + error.message,
        code: 'USER_CACHE_SET_ERROR',
        timestamp: new Date().toISOString(),
      };
      this.logger.error(errorDetails, error.stack);
    }
    return userUpdate;
  }

  async deleteService(id: string, user?: UserEntity) {
    if (user) await this.idAuthorize(id, user);

    await this.delete(id);

    try {
      await this.usersCacheService.delete({ id: id });
    } catch (error) {
      const errorDetails = {
        message: 'User cache delete: ' + error.message,
        code: 'USER_CACHE_DELETE_ERROR',
        timestamp: new Date().toISOString(),
      };
      this.logger.error(errorDetails, error.stack);
    }
    return;
  }

  async idAuthorize(
    userId: string,
    userAuthorize: UserEntity,
  ): Promise<UserEntity> {
    let userExists = await this.usersCacheService.get({ id: userId });

    if (!userExists) {
      userExists = await this.findOne([], { id: userId });

      if (!userExists) {
        throw new HttpException(
          'User with id ' + userId + ' does not exist',
          HttpStatus.NOT_FOUND,
        );
      }

      await this.usersCacheService.set({ id: userId }, userExists);
    }

    if (userAuthorize.role === 'Admin') {
      return userExists;
    } else if (userId === userAuthorize.id) {
      return userExists;
    } else {
      throw new HttpException(
        'Access denied: Unauthorized access attempt.',
        HttpStatus.FORBIDDEN,
      );
    }
  }
}
