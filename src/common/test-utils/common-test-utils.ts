import { HttpStatus } from '@nestjs/common';

export function getHttpStatusName(statusCode: number): string {
  return HttpStatus[statusCode];
}
