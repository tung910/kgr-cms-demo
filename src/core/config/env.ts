import { z } from 'zod';

const appEnvSchema = z.object({
  VITE_API_BASE_URL: z.string().trim().min(1).default('/api'),
  VITE_ENABLE_MOCKS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

export interface AppEnv {
  apiBaseUrl: string;
  enableMocks: boolean;
}

const parsedEnv = appEnvSchema.safeParse(import.meta.env);

if (!parsedEnv.success) {
  const invalidKeys = parsedEnv.error.issues
    .map((issue) => issue.path.join('.'))
    .filter(Boolean)
    .join(', ');

  throw new Error(`Invalid environment configuration: ${invalidKeys}`);
}

export const env: AppEnv = {
  apiBaseUrl: parsedEnv.data.VITE_API_BASE_URL,
  enableMocks: parsedEnv.data.VITE_ENABLE_MOCKS,
};
