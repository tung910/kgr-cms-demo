export type ApiErrorKind =
  | 'unauthenticated'
  | 'forbidden'
  | 'notFound'
  | 'validation'
  | 'network'
  | 'server'
  | 'invalidResponse'
  | 'unknown';

export interface RequestOptions {
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

export interface ApiClient {
  get<T>(path: string, options?: RequestOptions): Promise<T>;
  post<TResponse, TBody = unknown>(
    path: string,
    body: TBody,
    options?: RequestOptions
  ): Promise<TResponse>;
  put<TResponse, TBody = unknown>(
    path: string,
    body: TBody,
    options?: RequestOptions
  ): Promise<TResponse>;
  delete<T>(path: string, options?: RequestOptions): Promise<T>;
}
