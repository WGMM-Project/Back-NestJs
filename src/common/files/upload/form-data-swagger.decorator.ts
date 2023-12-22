import { applyDecorators } from '@nestjs/common';
import { ApiConsumes } from '@nestjs/swagger';
import { FormDataRequest } from 'nestjs-form-data';
import { FormDataInterceptorConfig } from 'nestjs-form-data/dist/interfaces';

export function FormDataSwagger(config?: FormDataInterceptorConfig) {
  return applyDecorators(
    ApiConsumes('multipart/form-data'),
    FormDataRequest(config),
  );
}
