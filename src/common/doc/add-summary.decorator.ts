type SummaryMetaData = {
  summary: string;
  priority: number;
};

function createMethodDecoratorForSummary(
  metaKeySetSummary: string,
  summaryData: SummaryMetaData,
  metakeySetResult: string,
) {
  return (target, key, descriptor) => {
    let summaries = Reflect.getMetadata(metaKeySetSummary, descriptor.value) as
      | SummaryMetaData[]
      | undefined;

    if (!summaries) {
      summaries = [];
    }

    summaries.push(summaryData);
    // Tri des résumés en ordre croissant de priorité
    summaries.sort((a, b) => a.priority - b.priority);

    // Fusionner les résumés en un seul
    const combinedSummary = summaries.map((s) => s.summary).join(' ');

    Reflect.defineMetadata(metaKeySetSummary, summaries, descriptor.value);

    let swagger = Reflect.getMetadata(metakeySetResult, descriptor.value);

    if (!swagger) {
      swagger = {};
    }

    swagger.summary = combinedSummary;

    Reflect.defineMetadata(metakeySetResult, swagger, descriptor.value);
    return descriptor;
  };
}

/**
 * Decorator that adds or modifies the Swagger summary for a controller/route. Multiple summaries will be merged in order of their priority.
 *
 * @param summary The summary text for the Swagger documentation.
 * @param priority Priority of this summary. Lower values have higher precedence.
 *
 * @publicApi
 */
export function AddSummary(summary: string, priority: number = 10) {
  return createMethodDecoratorForSummary(
    'autoback/addSummary',
    { summary, priority },
    'swagger/apiOperation',
  );
}
