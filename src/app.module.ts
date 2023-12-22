import { AppService } from '@/app.service';
import typeorm from '@Config/typeorm';
import { FilesModule } from '@Files/files.module';
import { CommonModule } from '@Helper/common.module';
import { CompressionInterceptor } from '@Helper/compression.interceptor';
import { GlobalExceptionFilter } from '@Helper/exception-filters/global-exception.error';
import {
  getAsNumberConfig,
  getAsStringConfig,
} from '@Helper/fn/get-as-config.helper';
import { getEnv } from '@Helper/fn/get-env.helper';
import { LoggerMiddleware } from '@Helper/logger/logger.middleware';
import { TransformInterceptor } from '@Helper/transform.interceptor';
import { AuthModule } from '@Users/auth/auth.module';
import { UsersModule } from '@Users/users.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { CacheModule } from '@nestjs/cache-manager';
import {
  INestApplication,
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { redisStore } from 'cache-manager-redis-yet';
import { FileSystemStoredFile, NestjsFormDataModule } from 'nestjs-form-data';
import { HealthModule } from './api/health/health.module';

@Module({
  imports: [
    HealthModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: (() => {
        return getEnv();
      })(),
      load: [typeorm],
    }),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      isGlobal: true,
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        host: getAsStringConfig(configService, 'REDIS_HOST'),
        port: getAsNumberConfig(configService, 'REDIS_PORT'),
        ttl: getAsNumberConfig(configService, 'CACHE_DEFAULT_TTL'),
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) =>
        configService.get('typeorm'),
      inject: [ConfigService],
    }),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: getAsStringConfig(configService, 'MAIL_HOST'),
          port: getAsNumberConfig(configService, 'MAIL_PORT'),
          secure: false, // true for 465, false for other ports
          auth: {
            user: getAsStringConfig(configService, 'MAIL_EMAIL'),
            pass: getAsStringConfig(configService, 'MAIL_PASSWORD'),
          },
        },
        defaults: {
          from:
            'Intra GIE "No Reply" <' +
            getAsStringConfig(configService, 'MAIL_EMAIL') +
            '>',
        },
        template: {
          dir: 'templates/',
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
      inject: [ConfigService],
    }),
    NestjsFormDataModule.configAsync({
      imports: [ConfigModule],
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      useFactory: async (configService: ConfigService) => ({
        storage: FileSystemStoredFile,
        fileSystemStoragePath: 'tmp/files',
        autoDeleteFile: true,
      }),
      isGlobal: true,
      inject: [ConfigService],
    }),
    FilesModule,
    UsersModule,
    AuthModule,
    CommonModule,
  ],
  controllers: [],
  providers: [
    GlobalExceptionFilter,
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: CompressionInterceptor,
    },
  ],
  exports: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}

export async function configGlobal(app: INestApplication) {
  const globalExceptionFilter = app.get(GlobalExceptionFilter);
  app.useGlobalFilters(globalExceptionFilter);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();
  /* try {
    const dataSource = app.get(DataSource);
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }

    await dataSource.runMigrations();
    console.log('Migrations run successfully');
  } catch (error) {
    console.error('Error during migrations', error);
  } */
}
