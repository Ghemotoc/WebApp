/**
 * Where the app starts in the browser (story S1-E1-01).
 *
 * Who calls it: index.html loads this file with <script type="module" src="/src/main.tsx">.
 * What it calls next: the translations (src/lib/i18n.ts), the shared providers
 * (src/app/AppProviders.tsx) and the router (src/app/router.tsx), which picks the page for the
 * current address. See docs/code-tour.md for the whole journey.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';

import { AppProviders } from '@/app/AppProviders';
import { appRoutes } from '@/app/router';
import { createI18n, syncDocumentLanguage } from '@/lib/i18n';
import '@/styles/index.css';

// Step 1: find the empty <div id="root"> in index.html that React draws into.
const rootElement = document.getElementById('root');
if (rootElement === null) {
  // Without it nothing can be shown, so stop with a message a developer can act on.
  throw new Error('index.html must contain <div id="root"></div> for the app to start.');
}

// Step 2: start the translations in Romanian and keep <html lang> in step with the language.
const i18n = createI18n();
syncDocumentLanguage(i18n);

// Step 3: build the router from the route list; it reads the address bar to pick the page.
const router = createBrowserRouter(appRoutes);

// Step 4: draw the app. StrictMode runs extra checks in development only.
createRoot(rootElement).render(
  <StrictMode>
    <AppProviders i18n={i18n}>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
