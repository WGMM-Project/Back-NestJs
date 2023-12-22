import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import bytes from 'bytes';
import { Transform } from 'class-transformer';
import { IsOptional } from 'class-validator';
import {
  HasExtension,
  HasMimeType,
  IsFile,
  IsFiles,
  MaxFileSize,
  MinFileSize,
} from 'nestjs-form-data';
import { MetaSource } from 'nestjs-form-data/dist/interfaces/MetaFieldSource';

function getMimeTypes(type: string): string[] {
  const mimeTypesMap = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'],
    audio: ['audio/mpeg', 'audio/ogg', 'audio/*'],
    // Ajoutez d'autres catégories ici si nécessaire
  };

  return mimeTypesMap[type] || [];
}

function transformMimeTypes(mimeTypes: string[]): string[] {
  return mimeTypes.flatMap((mimeType) =>
    getMimeTypes(mimeType).length > 0 ? getMimeTypes(mimeType) : [mimeType],
  );
}

interface ApiFileOptions {
  minSize?: number | string;
  maxSize?: number | string;
  mimeTypes?: string[];
  extensions?: string[];
  mimeCheckStrict?: boolean;
  extensionCheckStrict?: boolean;
  mimeStrictSource?: MetaSource;
  extensionStrictSource?: MetaSource;
  description?: string;
  required?: boolean;
  isArray?: boolean;
}

/**
 * Decorator for file upload endpoints in a NestJS application. This decorator
 * adds various file validations and Swagger documentation enhancements.
 *
 * @param {ApiFileOptions} options - Configuration options for file upload.
 * @param {number|string} [options.minSize] - Minimum file size. Can be a number (bytes)
 *                                           or a string like '200KB', '1MB', etc.
 * @param {number|string} [options.maxSize='10MB'] - Maximum file size. Can be a number (bytes)
 *                                                   or a string like '500KB', '2MB', etc.
 * @param {string[]} [options.mimeTypes] - Array of allowed MIME types for the file.
 * @param {string[]} [options.extensions] - Array of allowed file extensions.
 * @param {boolean} [options.mimeCheckStrict=false] - Enable strict MIME type checking.
 * @param {boolean} [options.extensionCheckStrict=false] - Enable strict extension checking.
 * @param {MetaSource} [options.mimeStrictSource=MetaSource.bufferMagicNumber] - Source for strict MIME type checking.
 * @param {MetaSource} [options.extensionStrictSource=MetaSource.bufferMagicNumber] - Source for strict extension checking.
 * @param {string} [options.description=''] - Custom description for Swagger documentation.
 * @param {boolean} [options.required=true] - Whether the file is required.
 * @param {boolean} [options.isArray=false] - Whether the field is an array of files.
 *
 * @example
 * // Using ApiFile in a DTO
 * class FileUploadDto {
 *   ⁣@ApiFile({
 *     maxSize: '5MB',
 *     mimeTypes: ['image/jpeg', 'image/png'],
 *     description: 'User avatar image',
 *     required: true,
 *   })
 *   avatar: FileSystemStoredFile;
 * }
 */

export function ApiFile(options: ApiFileOptions = {}) {
  const {
    minSize,
    maxSize = '10MB', // Default value as a string
    mimeTypes,
    extensions,
    mimeCheckStrict = false,
    extensionCheckStrict = false,
    mimeStrictSource = MetaSource.bufferMagicNumber,
    extensionStrictSource = MetaSource.bufferMagicNumber,
    description = '',
    required = true,
    isArray = false,
  } = options;

  const maxSizeInBytes =
    typeof maxSize === 'string' ? bytes.parse(maxSize) : maxSize;
  const minSizeInBytes =
    typeof minSize === 'string' ? bytes.parse(minSize) : minSize;

  const decorators = [];

  if (isArray) {
    decorators.push(IsFiles());
  } else {
    decorators.push(IsFile());
  }

  const validationOptions = isArray ? { each: true } : undefined;

  const transformedMimeTypes = mimeTypes
    ? transformMimeTypes(mimeTypes)
    : undefined;

  if (minSizeInBytes !== undefined) {
    decorators.push(MinFileSize(minSizeInBytes, validationOptions));
  }

  decorators.push(MaxFileSize(maxSizeInBytes, validationOptions));

  if (mimeTypes) {
    const strictSource = mimeCheckStrict ? mimeStrictSource : undefined;
    decorators.push(
      HasMimeType(transformedMimeTypes, strictSource, validationOptions),
    );
  }

  if (extensions) {
    const strictSource = extensionCheckStrict
      ? extensionStrictSource
      : undefined;
    decorators.push(HasExtension(extensions, strictSource, validationOptions));
  }

  // Construction de la description
  let autoDescription = description;
  if (description) {
    autoDescription += ' - ';
  }
  autoDescription += `Max size: ${maxSize}`;
  if (minSize !== undefined) {
    autoDescription += `, Min size: ${minSize}`;
  }
  if (mimeTypes) {
    autoDescription += `, MIME Types: ${mimeTypes.join(', ')}`;
  }
  if (extensions) {
    autoDescription += `, Extensions: ${extensions.join(', ')}`;
  }

  decorators.push(
    ApiProperty({
      type: isArray ? 'array' : 'string',
      format: 'binary',
      description: autoDescription,
      required,
    }),
  );

  if (options.required === false) {
    decorators.push(IsOptional());
    decorators.push(
      Transform(({ value }) => (value === '' ? undefined : value)),
    );
  }

  return applyDecorators(...decorators);
}
