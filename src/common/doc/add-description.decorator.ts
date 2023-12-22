type MetaDataInterface = {
  description: string;
  priority: number;
};

function createMethodDecorator(
  metaKeySetData: string,
  metaData: MetaDataInterface,
  metakeySetResult: string,
) {
  return (target, key, descriptor) => {
    let info = Reflect.getMetadata(metaKeySetData, descriptor.value) as
      | MetaDataInterface[]
      | undefined;

    if (!info) {
      info = [];
    }
    info.push(metaData);
    info.sort(function (task1, task2) {
      return task1.priority - task2.priority;
    });

    Reflect.defineMetadata(metaKeySetData, info, descriptor.value);

    const toReturn = info.map((value) => value.description).join('\n\n');

    let swagger = Reflect.getMetadata(metakeySetResult, descriptor.value);

    if (!swagger) {
      swagger = {
        summary: '',
      };
    }

    swagger.description = toReturn;

    Reflect.defineMetadata(metakeySetResult, swagger, descriptor.value);
    return descriptor;
  };
}

/**
 * Decorator that add swagger description to the controller/route. You can call this decorator several times on the same controller/route, this will merge all descriptions of this controller/route.
 *
 * @param description description of the route
 * @param priority Decide the place of this description.
 *
 * @publicApi
 */

export function AddDescription(description: string, priority: number = 10) {
  return createMethodDecorator(
    'autoback/addDescription',
    { description, priority },
    'swagger/apiOperation',
  );
}
