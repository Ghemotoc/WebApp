/**
 * The home page: for now an empty page that shows the product name (story S1-E1-01).
 *
 * Who shows it: the router (src/app/router.tsx) for the address "/".
 * What it uses: translations from src/locales/<language>/common.json through react-i18next. The
 * product name inside them comes from src/config/brand.ts, so it is never typed here.
 * Later stories replace it with Discover (S1-E5-01) and the public home page (S1-E5-08).
 */
import { useTranslation } from 'react-i18next';

/**
 * Renders the home page in the current interface language.
 *
 * @returns a page with the product name as its main heading and a short line about the platform
 */
export function HomePage() {
  // The translation function for the current language (Romanian unless the reader changed it).
  const { t } = useTranslation();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-center gap-4 px-4 py-12 sm:px-8">
      {/* React places this <title> in the page's <head>, so the browser tab shows the product name. */}
      <title>{t('home.documentTitle')}</title>
      <h1 className="text-3xl font-bold break-words sm:text-5xl">{t('home.welcome')}</h1>
      <p className="text-lg sm:text-xl">{t('home.tagline')}</p>
      <p>{t('home.comingSoon')}</p>
    </main>
  );
}
