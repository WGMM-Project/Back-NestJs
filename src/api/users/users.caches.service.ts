import { CacheService } from '@Helper/cache/cache.service';
import {
  getAsBooleanConfig,
  getAsNumberConfig,
} from '@Helper/fn/get-as-config.helper';
import { UserEntity } from '@Users/entities/user.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';

export type UserKeyType = {
  id: string;
};

@Injectable()
export class UsersCacheService extends CacheService<UserKeyType, UserEntity> {
  ttl: number = 5000;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    protected configService: ConfigService,
  ) {
    super(cache);
    this.ttl = getAsNumberConfig(this.configService, 'USER_CACHE_TTL');
    this.debug = getAsBooleanConfig(this.configService, 'CACHE_DEBUG');
  }

  async getKey(params: UserKeyType): Promise<string> {
    const key = `users-single-id-` + params.id;
    return key;
  }
}
