// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { describe, expect, it } from 'vitest';

import {
  getApiErrorCode,
  getApiErrorMessage,
  getApiResponseMessage,
  getThrownErrorMessage,
} from '@/lib/api/error-utils';

describe('api error utils', () => {
  it('prefers response error messages over top-level messages and fallbacks', () => {
    expect(
      getApiResponseMessage(
        {
          success: false,
          error: { code: 'AUTH_INVALID', message: 'Invalid credentials' },
          message: 'Request failed',
        },
        'Fallback'
      )
    ).toBe('Invalid credentials');

    expect(
      getApiResponseMessage(
        {
          success: false,
          message: 'Request failed',
        },
        'Fallback'
      )
    ).toBe('Request failed');
  });

  it('extracts thrown object messages and falls back safely for unknown values', () => {
    expect(
      getApiErrorMessage({
        error: { code: 'VALIDATION_FAILED', message: 'Nested validation failed' },
      })
    ).toBe('Nested validation failed');
    expect(
      getApiErrorCode({
        error: { code: 'VALIDATION_FAILED', message: 'Nested validation failed' },
      })
    ).toBe('VALIDATION_FAILED');
    expect(getApiErrorMessage({ code: 'NETWORK_ERROR', message: 'Network error occurred' })).toBe(
      'Network error occurred'
    );
    expect(getApiErrorCode({ code: 'NETWORK_ERROR', message: 'Network error occurred' })).toBe(
      'NETWORK_ERROR'
    );
    expect(getThrownErrorMessage({ message: 'Network error occurred' }, 'Fallback')).toBe(
      'Network error occurred'
    );
    expect(getThrownErrorMessage(new Error('Boom'), 'Fallback')).toBe('Boom');
    expect(getThrownErrorMessage(null, 'Fallback')).toBe('Fallback');
  });
});
