import { ConfigService } from '@nestjs/config';

function isBoolean(value: any): boolean {
  if (typeof value === 'boolean') {
    return true;
  }
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value.toLowerCase() === 'false';
  }
  return false;
}

export function getAsStringConfig(
  configService: ConfigService,
  key: string,
): string {
  const value = configService.get(key);
  if (typeof value === 'string') {
    return value;
  }
  return String(value);
}

export function getAsNumberConfig(
  configService: ConfigService,
  key: string,
): number {
  const value = configService.get(key);
  if (typeof value === 'number') {
    return value;
  }
  const convertedValue = Number(value);
  if (isNaN(convertedValue)) {
    throw new Error(`Configuration key ${key} is not a valid number`);
  }
  return convertedValue;
}

export function getAsBooleanConfig(
  configService: ConfigService,
  key: string,
): boolean {
  const value = configService.get(key);
  if (isBoolean(value)) {
    if (typeof value === 'boolean') {
      return value;
    }
    return value.toLowerCase() === 'true';
  } else {
    throw new Error(
      `Configuration key ${key} cannot be converted to a boolean`,
    );
  }
}

export function getAsEnumConfig<T extends object>(
  configService: ConfigService,
  key: string,
  enumType: T,
): T[keyof T] {
  const value: string = configService.get<string>(key);
  if (value in enumType) {
    return enumType[value as keyof T];
  } else {
    throw new Error(
      `Configuration key ${key} does not correspond to a valid enum value`,
    );
  }
}
