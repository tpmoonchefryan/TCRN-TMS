import type { OpenAPIObject } from '@nestjs/swagger';

type SwaggerParameterLocation = 'header' | 'query' | 'path' | 'cookie';

export interface SwaggerParameter {
  name: string;
  in: SwaggerParameterLocation;
  required?: boolean;
  description?: string;
  schema?: Record<string, unknown>;
}

const HTTP_METHODS = new Set(['get', 'post', 'put', 'delete', 'patch', 'options', 'head']);

// Global Swagger parameters are intentionally empty. Legacy private owner carriers
// such as X-Tenant-ID and X-Talent-Id remain transport compatibility concerns or
// endpoint-specific contracts, not canonical global OpenAPI parameters.
export const GLOBAL_SWAGGER_PARAMETERS: ReadonlyArray<SwaggerParameter> = [];

export function applyGlobalSwaggerParameters(document: OpenAPIObject): void {
  if (GLOBAL_SWAGGER_PARAMETERS.length === 0) {
    return;
  }

  for (const pathItem of Object.values(document.paths)) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!HTTP_METHODS.has(method) || !operation || typeof operation !== 'object') {
        continue;
      }

      const existingParameters = Array.isArray(operation.parameters) ? [...operation.parameters] : [];

      for (const parameter of GLOBAL_SWAGGER_PARAMETERS) {
        const alreadyPresent = existingParameters.some(
          (existingParameter) =>
            typeof existingParameter === 'object' &&
            existingParameter !== null &&
            'name' in existingParameter &&
            'in' in existingParameter &&
            existingParameter.name === parameter.name &&
            existingParameter.in === parameter.in,
        );

        if (!alreadyPresent) {
          existingParameters.push({ ...parameter });
        }
      }

      operation.parameters = existingParameters;
    }
  }
}
