import { Type } from '@nestjs/common';
import {
  applyIsOptionalDecorator,
  inheritPropertyInitializers,
  inheritTransformationMetadata,
  inheritValidationMetadata,
} from '@nestjs/mapped-types';
import { DECORATORS } from '@nestjs/swagger/dist/constants';
import { ApiProperty } from '@nestjs/swagger/dist/decorators';
import { MetadataLoader } from '@nestjs/swagger/dist/plugin/metadata-loader';
import { METADATA_FACTORY_NAME } from '@nestjs/swagger/dist/plugin/plugin-constants';
import { ModelPropertiesAccessor } from '@nestjs/swagger/dist/services/model-properties-accessor';
import { clonePluginMetadataFactory } from '@nestjs/swagger/dist/type-helpers/mapped-types.utils';
import { mapValues } from 'lodash';

const modelPropertiesAccessor = new ModelPropertiesAccessor();

export function RequiredType<T>(classRef: Type<T>): Type<Partial<T>> {
  const fields = modelPropertiesAccessor.getModelProperties(classRef.prototype);

  abstract class RequiredTypeClass {
    constructor() {
      inheritPropertyInitializers(this, classRef);
    }
  }
  const keysWithValidationConstraints = inheritValidationMetadata(
    classRef,
    RequiredTypeClass,
  );
  if (keysWithValidationConstraints) {
    keysWithValidationConstraints
      .filter((key) => !fields.includes(key))
      .forEach((key) => applyIsOptionalDecorator(RequiredTypeClass, key));
  }

  inheritTransformationMetadata(classRef, RequiredTypeClass);

  function applyFields(fields: string[]) {
    clonePluginMetadataFactory(
      RequiredTypeClass as Type<unknown>,
      classRef.prototype,
      (metadata: Record<string, any>) =>
        mapValues(metadata, (item) => ({ ...item, required: true })),
    );

    if (RequiredTypeClass[METADATA_FACTORY_NAME]) {
      const pluginFields = Object.keys(
        RequiredTypeClass[METADATA_FACTORY_NAME](),
      );
      pluginFields.forEach((key) =>
        applyIsOptionalDecorator(RequiredTypeClass, key),
      );
    }

    fields.forEach((key) => {
      const metadata =
        Reflect.getMetadata(
          DECORATORS.API_MODEL_PROPERTIES,
          classRef.prototype,
          key,
        ) || {};

      const decoratorFactory = ApiProperty({
        ...metadata,
        required: true,
      });
      decoratorFactory(RequiredTypeClass.prototype, key);
      applyIsOptionalDecorator(RequiredTypeClass, key);
    });
  }
  applyFields(fields);

  MetadataLoader.addRefreshHook(() => {
    const fields = modelPropertiesAccessor.getModelProperties(
      classRef.prototype,
    );
    applyFields(fields);
  });

  return RequiredTypeClass as Type<Partial<T>>;
}
