import axios from 'axios';

import { env } from '@/core/config/env';

import { ApiError, normalizeApiError } from './error';
import type { ApiClient, RequestOptions } from './types';

type UnauthenticatedHandler = () => void | Promise<void>;

const axiosClient = axios.create({
  baseURL: env.apiBaseUrl,
});

let readOnly = false;

// Role simulation (M10) must never write. The backend rejects it too; this
// stops the request before it leaves the browser. Only ending the simulation
// and signing out stay allowed — not password changes or other auth writes.
const SIMULATION_WRITABLE_PATHS = new Set(['/auth/logout', '/auth/simulate']);
export function setApiReadOnly(value: boolean): void {
  readOnly = value;
}

function assertWritable(path: string): void {
  if (readOnly && !SIMULATION_WRITABLE_PATHS.has(path)) {
    throw new ApiError('forbidden', 'Role simulation is read-only.', 403, {
      code: 'simulation_read_only',
    });
  }
}

let unauthenticatedHandler: UnauthenticatedHandler | undefined;
let unauthenticatedTransition: Promise<void> | undefined;

export function registerUnauthenticatedHandler(
  handler: UnauthenticatedHandler
): () => void {
  unauthenticatedHandler = handler;

  return () => {
    if (unauthenticatedHandler === handler) {
      unauthenticatedHandler = undefined;
    }
  };
}

async function handleUnauthenticatedResponse(): Promise<void> {
  if (!unauthenticatedHandler) return;

  if (!unauthenticatedTransition) {
    unauthenticatedTransition = Promise.resolve(
      unauthenticatedHandler()
    ).finally(() => {
      unauthenticatedTransition = undefined;
    });
  }

  await unauthenticatedTransition;
}

function toRequestConfig(options?: RequestOptions) {
  return {
    signal: options?.signal,
    headers: options?.headers,
  };
}

export const apiClient: ApiClient = {
  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    try {
      const response = await axiosClient.get<T>(path, toRequestConfig(options));
      return response.data;
    } catch (error) {
      const apiError = normalizeApiError(error);
      if (apiError.kind === 'unauthenticated') {
        await handleUnauthenticatedResponse();
      }
      throw apiError;
    }
  },

  async post<TResponse, TBody = unknown>(
    path: string,
    body: TBody,
    options?: RequestOptions
  ): Promise<TResponse> {
    assertWritable(path);
    try {
      const response = await axiosClient.post<TResponse>(
        path,
        body,
        toRequestConfig(options)
      );
      return response.data;
    } catch (error) {
      const apiError = normalizeApiError(error);
      if (apiError.kind === 'unauthenticated') {
        await handleUnauthenticatedResponse();
      }
      throw apiError;
    }
  },

  async put<TResponse, TBody = unknown>(
    path: string,
    body: TBody,
    options?: RequestOptions
  ): Promise<TResponse> {
    assertWritable(path);
    try {
      const response = await axiosClient.put<TResponse>(
        path,
        body,
        toRequestConfig(options)
      );
      return response.data;
    } catch (error) {
      const apiError = normalizeApiError(error);
      if (apiError.kind === 'unauthenticated') {
        await handleUnauthenticatedResponse();
      }
      throw apiError;
    }
  },

  async delete<T>(path: string, options?: RequestOptions): Promise<T> {
    assertWritable(path);
    try {
      const response = await axiosClient.delete<T>(
        path,
        toRequestConfig(options)
      );
      return response.data;
    } catch (error) {
      const apiError = normalizeApiError(error);
      if (apiError.kind === 'unauthenticated') {
        await handleUnauthenticatedResponse();
      }
      throw apiError;
    }
  },
};
