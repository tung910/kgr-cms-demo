import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/app/App';
import { AppProviders } from '@/app/providers/AppProviders';
import '@/app/styles/index.css';
import { env } from '@/core/config/env';

async function bootstrap() {
  if (import.meta.env.DEV && env.enableMocks) {
    const { worker } = await import('@/mocks/browser');
    await worker.start({ onUnhandledRequest: 'bypass' });
  }

  const rootElement = document.getElementById('root');

  if (!rootElement) throw new Error('Root element not found.');

  createRoot(rootElement).render(
    <StrictMode>
      <AppProviders>
        <App />
      </AppProviders>
    </StrictMode>
  );
}

void bootstrap();
