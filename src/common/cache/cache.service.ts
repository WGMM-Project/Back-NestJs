import { Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';

@Injectable()
export abstract class CacheService<TKeyType, TValueType> {
  debug: boolean;

  constructor(private cacheManager: Cache) {}

  ttl?: number = undefined;

  async get(params: TKeyType): Promise<TValueType> {
    const key = await this.getKey(params);

    const result = await this.cacheManager.get(key);

    if (this.debug === true) {
      if (result) {
        console.log('Get Cache ' + key + ' find');
      } else {
        console.log('Get Cache ' + key + ' not find');
      }
    }

    return result as TValueType;
  }

  async set(params: TKeyType, value: TValueType, ttl?: number): Promise<void> {
    const key = await this.getKey(params);

    if (this.debug === true) {
      console.log('Set Cache ' + key);
    }

    if (!ttl) {
      ttl = this.ttl;
    }
    await this.cacheManager.set(key, value, ttl);
  }

  async delete(params: TKeyType): Promise<void> {
    const key = await this.getKey(params);

    if (this.debug === true) {
      console.log('Del Cache ' + key);
    }

    await this.cacheManager.del(key);
  }

  abstract getKey(params: TKeyType): Promise<string>;
}
