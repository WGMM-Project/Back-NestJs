import { WinstonLogger } from '@Helper/logger/logger.service';
import { Global, Module } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

@Global()
@Module({
  providers: [WinstonLogger],
  exports: [WinstonLogger],
})
export class CommonModule {
  static moduleRef: ModuleRef;

  constructor(moduleRef: ModuleRef) {
    CommonModule.moduleRef = moduleRef;
  }
}
