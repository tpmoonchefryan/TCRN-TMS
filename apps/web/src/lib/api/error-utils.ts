// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { ApiResponse } from './core';

export const getApiResponseMessage = <T>(
  response: ApiResponse<T>,
  fallback: string
): string => response.error?.message || response.message || fallback;

export const getApiErrorMessage = (error: unknown): string | undefined => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'error' in error &&
    typeof (error as { error?: unknown }).error === 'object' &&
    (error as { error?: unknown }).error !== null &&
    'message' in ((error as { error: { message?: unknown } }).error)
  ) {
    const nestedMessage = (error as { error: { message?: unknown } }).error.message;
    if (typeof nestedMessage === 'string') {
      return nestedMessage;
    }
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }

  return undefined;
};

export const getApiErrorCode = (error: unknown): string | undefined => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'error' in error &&
    typeof (error as { error?: unknown }).error === 'object' &&
    (error as { error?: unknown }).error !== null &&
    'code' in ((error as { error: { code?: unknown } }).error)
  ) {
    const nestedCode = (error as { error: { code?: unknown } }).error.code;
    if (typeof nestedCode === 'string') {
      return nestedCode;
    }
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code?: unknown }).code === 'string'
  ) {
    return (error as { code: string }).code;
  }

  return undefined;
};

export const getTranslatedApiErrorMessage = (
  error: unknown,
  translate: (key: never) => string,
  fallback: string
): string => {
  const errorCode = getApiErrorCode(error);
  if (errorCode && typeof errorCode === 'string') {
    try {
      const translated = translate(errorCode as never);
      if (translated && translated !== errorCode && !translated.startsWith('MISSING_MESSAGE')) {
        return translated;
      }
    } catch {
      // Fall through to the raw error message or fallback below.
    }
  }

  return getApiErrorMessage(error) || fallback;
};

export const getThrownErrorMessage = (error: unknown, fallback: string): string => {
  return getApiErrorMessage(error) || fallback;
};
