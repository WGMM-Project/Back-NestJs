import { Type as NestjsType } from '@nestjs/common';
import { Transform, Type, plainToInstance } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';

/**
 * A decorator for transforming received form data (in JSON string format)
 * into an object of the specified type and applying deep validation.
 *
 * @param {NestjsType<T>} type - The class type to instantiate and validate.
 * @param {boolean} [isRequired=true] - Specifies whether the field is mandatory.
 * @return {Function} The custom decorator.
 *
 * @example
 * class Profile {
 *   ⁣@IsString()
 *   name: string;
 * }
 *
 * class MyDto {
 *   ⁣@FormDataReceiveData(Profile)
 *   data: Profile;
 * }
 */
export function FormDataReceiveData<T>(type: NestjsType<T>, isRequired = true) {
  return function (object: any, propertyName: string) {
    if (!isRequired) {
      IsOptional()(object, propertyName);
    }

    ValidateNested()(object, propertyName);
    Transform(({ value }) => {
      if (value === undefined || value === null) {
        return value; // Laissez passer les valeurs undefined/null si IsOptional est appliqué
      }

      try {
        const toReturn = plainToInstance(type, JSON.parse(value));
        return toReturn;
      } catch {
        if (isRequired) {
          throw new Error(`${propertyName} doit être une chaîne JSON valide`);
        }
        return undefined;
      }
    })(object, propertyName);
    Type(() => type)(object, propertyName);
  };
}
