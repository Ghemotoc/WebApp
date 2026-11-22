/**
 * Where the app starts in the browser (story S1-E1-01).
 *
 * Who calls it: index.html loads this file with <script type="module" src="/src/main.tsx">.
 * What it calls next: the translations (src/lib/i18n.ts) with the admins' overrides
 * (src/lib/interface-text-overrides.ts), the shared providers
 * (src/app/AppProviders.tsx) and the router (src/app/router.tsx), which picks the page for the
 * current address. See docs/code-tour.md for the whole journey.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';

import { AppProviders } from '@/app/AppProviders';
import { appRoutes } from '@/app/router';
import { installCallRecorder } from '@/features/errors/lib/callRecorder';
import { installGlobalErrorHandlers } from '@/features/errors/lib/installGlobalErrorHandlers';
import { createI18n, syncDocumentLanguage, type SupportedLanguage } from '@/lib/i18n';
import { loadInterfaceLanguage } from '@/lib/i18n-loading';
import { installInterfaceTextOverrides } from '@/lib/interface-text-overrides';
import { readDeviceLanguage } from '@/lib/language-preference';
import '@/styles/index.css';

// Step 1: find the empty <div id="root"> in index.html that React draws into.
const rootElement = document.getElementById('root');
if (rootElement === null) {
  // Without it nothing can be shown, so stop with a message a developer can act on.
  throw new Error('index.html must contain <div id="root"></div> for the app to start.');
}

// Step 2: report errors nothing else catches to our own error log, scrubbed of anything personal
// (S1-E1-05). Errors while a page draws go to the router's error page instead.
installGlobalErrorHandlers();
// Then note every call to the back end for the staff's call log (LOGS-1; Robert, 6 Nov 2026):
// kind, name, outcome, error code and duration, never what was sent or came back. It goes in
// before the Supabase client is made, so the client's calls pass through it.
installCallRecorder();

/**
 * Starts the translations and draws the app in one language.
 *
 * @param startingLanguage - the language the first screen shows
 */
function startApp(startingLanguage: SupportedLanguage): void {
  // Step 3a: the translations, with <html lang> kept in step. A signed-in account's language is
  // applied a moment later by useAccountLanguage in AppLayout.
  const i18n = createI18n(startingLanguage);
  syncDocumentLanguage(i18n);
  // Then, in the background, lay the admins' published text over the files (S1-E11-18). The
  // first screen never waits for it, and if the read fails the file text stays.
  installInterfaceTextOverrides(i18n);

  // Step 4: build the router from the route list; it reads the address bar to pick the page.
  const router = createBrowserRouter(appRoutes);

  // Step 5: draw the app. StrictMode runs extra checks in development only.
  createRoot(rootElement as HTMLElement).render(
    <StrictMode>
      <AppProviders i18n={i18n}>
        <RouterProvider router={router} />
      </AppProviders>
    </StrictMode>,
  );
}

// Step 3: start in the language this browser last chose (Romanian on a first visit, whatever the
// browser's own language; S1-E1-04). Romanian is bundled, so it starts at once, with no await:
// a top-level await here held up the whole first screen, even when nothing had to download
// (e2e/reader-performance.spec.ts went from about 1.6 to 2.5 seconds). English downloads first
// when this browser last chose it (the reader speed fix, 21 Nov 2026), so the first screen is
// never half one language; if that download fails, the app starts in Romanian rather than show
// nothing, and the language menu can try again.
const deviceLanguage = readDeviceLanguage();
if (deviceLanguage === 'ro') {
  startApp('ro');
} else {
  loadInterfaceLanguage(deviceLanguage).then(
    () => startApp(deviceLanguage),
    (error: unknown) => {
      console.error('The English text could not load, so the app starts in Romanian.', error);
      startApp('ro');
    },
  );
}
