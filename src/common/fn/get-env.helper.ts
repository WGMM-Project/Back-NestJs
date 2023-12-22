import { existsSync } from 'fs';
import { resolve } from 'path';

export function getEnv() {
  let envFilePath: string;
  switch (process.env.NODE_ENV) {
    case 'production':
      envFilePath = '.env.production';
      break;
    case 'test':
      envFilePath = '.env.test';
      break;
    case 'github':
      envFilePath = '.env.github';
      break;
    default:
      envFilePath = '.env.development';
  }

  const fullPath = resolve(envFilePath);
  if (!existsSync(fullPath)) {
    throw new Error(`Environment file not found: ${fullPath}`);
  }

  return fullPath;
}
