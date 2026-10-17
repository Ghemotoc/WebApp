/**
 * AppLayout: the frame around every public page: skip link, top bar, the page, footer
 * (story S1-E1-03).
 *
 * Who uses it: the router (src/app/router.tsx) wraps every public route in it; the page itself
 * appears where <Outlet /> is. The admin site gets its own frame with the staff bar (S1-E11-01).
 * Accessibility: the first thing a keyboard user reaches is "Skip to content", which jumps past the
 * top bar to the page (WCAG 2.2, 2.4.1 Bypass blocks). The page sits in the one <main> landmark.
 */
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router';

import { Footer } from './Footer';
import { TopBar } from './TopBar';

/**
 * Renders the frame and the current page inside it.
 *
 * @returns the whole page layout
 */
export function AppLayout() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink">
      <a
        href="#main"
        className="sr-only z-20 rounded-full bg-surface px-4 py-2 focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        {t('shell.skipToContent')}
      </a>
      <TopBar />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
