import { registerAs } from '@nestjs/config';
import {
  getAsBooleanEnv,
  getAsNumberEnv,
  getAsStringEnv,
} from '../common/fn/get-as-env.helper';

export function createConfig() {
  return {
    type: 'postgres',
    host: getAsStringEnv('DATABASE_HOST'),
    port: getAsNumberEnv('DATABASE_PORT'),
    username: getAsStringEnv('DATABASE_USER'),
    password: getAsStringEnv('DATABASE_PASSWORD'),
    database: getAsStringEnv('DATABASE_NAME'),
    synchronize: getAsBooleanEnv('DATABASE_SYNC'),
    autoLoadEntities: true,
    entities: ['dist/**/*.entity{.ts,.js}'],
    migrations: ['dist/migrations/*{.ts,.js}'],
    migrationsTableName: 'migrations_table',
    cli: {
      migrationsDir: 'src/migrations',
    },
  };
}

export default registerAs('typeorm', () => {
  return createConfig();
});
