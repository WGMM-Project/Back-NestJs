import 'reflect-metadata';

import { ensureDatabaseExists } from '@Helper/check-database.helper';
import {
  getAsNumberConfig,
  getAsStringConfig,
} from '@Helper/fn/get-as-config.helper';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import { AppModule, configGlobal } from './app.module';

async function bootstrap() {
  await ensureDatabaseExists();
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  app.enableCors();

  await configGlobal(app);

  const config = new DocumentBuilder()
    .addBearerAuth()
    .setTitle(getAsStringConfig(configService, 'PROJECT_NAME') + ' API')
    .setDescription(
      'The API for ' + getAsStringConfig(configService, 'PROJECT_NAME'),
    )
    .setVersion('0.2')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    deepScanRoutes: true,
  });

  fs.writeFileSync('./swagger-spec.json', JSON.stringify(document));
  SwaggerModule.setup('api', app, document, {
    explorer: true,
    swaggerOptions: { persistAuthorization: true },
  });

  const backPort = getAsNumberConfig(configService, 'BACK_PORT');
  await app.listen(backPort, () => {
    console.log('[WEB]', `http://localhost:${backPort}`);
    console.log('[API]', `http://localhost:${backPort}/api`);
  });
}

bootstrap();
