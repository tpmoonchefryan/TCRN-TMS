import type { OpenAPIObject } from '@nestjs/swagger';
import { describe, expect, it } from 'vitest';

import { applyGlobalSwaggerParameters, GLOBAL_SWAGGER_PARAMETERS } from './swagger-global-parameters';

const createDocument = (): OpenAPIObject => ({
  openapi: '3.0.0',
  info: {
    title: 'Test API',
    version: '1.0.0',
  },
  paths: {
    '/integration/adapters': {
      get: {
        summary: 'List adapters',
        responses: {},
      },
    },
  },
});

describe('Swagger global parameter policy contract', () => {
  it('does not advertise legacy private owner headers as global Swagger parameters', () => {
    const parameterKeys = GLOBAL_SWAGGER_PARAMETERS.map((parameter) => `${parameter.in}:${parameter.name}`);

    expect(parameterKeys).not.toContain('header:X-Tenant-ID');
    expect(parameterKeys).not.toContain('header:X-Talent-Id');
  });

  it('leaves operations unchanged when no global parameters are configured', () => {
    const document = createDocument();

    applyGlobalSwaggerParameters(document);

    expect(document.paths['/integration/adapters']?.get?.parameters).toBeUndefined();
  });
});
