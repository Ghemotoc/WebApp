/**
 * Wraps the whole app in the shared services every screen needs (story S1-E1-01).
 *
 * Who uses it: src/main.tsx, around the router; tests, around a single page.
 * What it provides:
 * - TanStack Query: the cache that hooks in src/features/<feature>/hooks use to load and save data
 *   from Supabase (the first ones arrive in S1-E1-02 and S1-E2-01).
 * - i18next: translations, so any component can call useTranslation().
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { i18n as I18nInstance } from 'i18next';
import { useState, type ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';

import { shouldRetryQuery } from '@/lib/query-retry';

/** What AppProviders needs: the page to wrap and the translation instance to use. */
interface AppProvidersProps {
  children: ReactNode;
  i18n: I18nInstance;
}

/**
 * Gives every screen inside it the data cache and the translations.
 *
 * @param props.children - the app (or, in tests, one page)
 * @param props.i18n - the translation instance from createI18n() in src/lib/i18n.ts
 * @returns the wrapped content
 */
export function AppProviders({ children, i18n }: AppProvidersProps) {
  // One data cache for the lifetime of the app. useState keeps the same cache across re-renders.
  // A refused read (401 or 403) fails at once instead of after about 7 seconds of retries
  // (src/lib/query-retry.ts; Robert's staging check, 17 Oct 2026).
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: shouldRetryQuery } } }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </QueryClientProvider>
  );
}
