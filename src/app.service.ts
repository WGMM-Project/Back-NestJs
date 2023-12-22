import { WinstonLogger } from '@Helper/logger/logger.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { RedisCache, RedisStore } from 'cache-manager-redis-yet';
import { Connection } from 'typeorm';

@Injectable()
export class AppService implements OnApplicationShutdown {
  constructor(
    private readonly db: Connection,
    private readonly logger: WinstonLogger,
    @Inject(CACHE_MANAGER) private cacheManager: RedisCache,
  ) {}

  async onApplicationShutdown(signal: string) {
    console.log(`Received ${signal}, shutting down...`);

    const cacheStore: RedisStore = this.cacheManager.store;

    const client = cacheStore.client;

    if (client && typeof client.disconnect === 'function') {
      await client.disconnect();
      console.log('Disconnected from Redis.');
    }

    await this.closeDBConnection();

    await this.logger.shutdown();
  }

  async closeDBConnection() {
    try {
      if (this.db.isInitialized) {
        await this.db.destroy();
        console.log('DB connection closed');
      } else {
        console.log('DB connection is already closed');
      }
    } catch (err) {
      console.error('Error closing connection to DB:', err);
    }
  }
}
