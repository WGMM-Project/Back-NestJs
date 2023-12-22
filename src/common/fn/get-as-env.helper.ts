function isBoolean(value: any): boolean {
  if (typeof value === 'boolean') {
    return true;
  }
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value.toLowerCase() === 'false';
  }
  return false;
}

export function getAsStringEnv(key: string): string {
  const value = process.env[key];
  if (typeof value === 'string') {
    return value;
  }
  return String(value);
}

export function getAsNumberEnv(key: string): number {
  const value = process.env[key];
  if (typeof value === 'number') {
    return value;
  }
  const convertedValue = Number(value);
  if (isNaN(convertedValue)) {
    throw new Error(`Environment variable ${key} is not a valid number`);
  }
  return convertedValue;
}

export function getAsBooleanEnv(key: string): boolean {
  const value = process.env[key];
  if (isBoolean(value)) {
    if (typeof value === 'boolean') {
      return value;
    }
    return value.toLowerCase() === 'true';
  } else {
    throw new Error(
      `Environment variable ${key} cannot be converted to a boolean`,
    );
  }
}

export function getAsEnumEnv<T extends object>(
  key: string,
  enumType: T,
): T[keyof T] {
  const value: string = process.env[key] as string;
  if (value in enumType) {
    return enumType[value as keyof T];
  } else {
    throw new Error(
      `Environment variable ${key} does not correspond to a valid enum value`,
    );
  }
}
