export type ApplicationCompletenessInput = {
  name: string;
  description?: string | null;
  technicalOwner?: string | null;
  businessUnit?: string | null;
  environments: Array<{
    name: string;
    noDatabase: boolean;
    components: Array<{
      assetCount: number;
      vmCount: number;
      logicalDatabaseCount: number;
    }>;
  }>;
};

export function evaluateApplicationCompleteness(
  input: ApplicationCompletenessInput,
) {
  const prod = input.environments.find(
    (environment) => environment.name === 'PROD',
  );
  const prodComponents = prod?.components ?? [];
  const missingFields = [
    !input.name.trim() && 'name',
    !input.description?.trim() && 'description',
    !input.technicalOwner?.trim() && 'technical owner',
    !input.businessUnit?.trim() && 'business unit',
    !prod && 'PROD environment',
    prod && prodComponents.length === 0 && 'PROD component',
    prod &&
      prodComponents.length > 0 &&
      prodComponents.every(
        (component) => component.assetCount + component.vmCount === 0,
      ) &&
      'PROD related compute',
    prod &&
      !prod.noDatabase &&
      prodComponents.length > 0 &&
      prodComponents.every(
        (component) => component.logicalDatabaseCount === 0,
      ) &&
      'PROD logical database or No Database declaration',
  ].filter(Boolean) as string[];
  return {
    complete: missingFields.length === 0,
    completeness: Math.max(
      0,
      Math.round(((8 - missingFields.length) / 8) * 100),
    ),
    missingFields,
  };
}
