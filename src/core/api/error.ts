import axios from 'axios';

import type { ApiErrorKind } from './types';

export class ApiError extends Error {
  constructor(
    public readonly kind: ApiErrorKind,
    message: string,
    public readonly status?: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function getBackendMessage(details: unknown): string | undefined {
  if (
    typeof details === 'object' &&
    details !== null &&
    'message' in details &&
    typeof details.message === 'string'
  ) {
    return details.message;
  }

  return undefined;
}

function getErrorKind(status: number): ApiErrorKind {
  switch (status) {
    case 401:
      return 'unauthenticated';
    case 403:
      return 'forbidden';
    case 404:
      return 'notFound';
    case 400:
    case 422:
      return 'validation';
    default:
      return Number.isInteger(status) && status >= 500 && status < 600
        ? 'server'
        : 'unknown';
  }
}

export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const details = error.response?.data;
    const message = getBackendMessage(details) ?? error.message;

    if (status !== undefined) {
      return new ApiError(getErrorKind(status), message, status, details);
    }

    if (error.request) {
      return new ApiError('network', message);
    }

    return new ApiError('unknown', message);
  }

  if (error instanceof Error) {
    return new ApiError('unknown', error.message);
  }

  return new ApiError('unknown', 'An unknown API error occurred.');
}

// Business error code sent by the backend in the response body (`{ code }`).
export function getApiErrorCode(error: unknown): string | undefined {
  if (
    error instanceof ApiError &&
    typeof error.details === 'object' &&
    error.details !== null &&
    'code' in error.details &&
    typeof error.details.code === 'string'
  ) {
    return error.details.code;
  }

  return undefined;
}
