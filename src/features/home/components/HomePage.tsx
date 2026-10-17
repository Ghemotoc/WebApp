/**
 * The home page: for now a short welcome that shows the product name (stories S1-E1-01, S1-E1-03).
 *
 * Who shows it: the router (src/app/router.tsx) for the address "/", inside AppLayout (top bar,
 * <main> and footer). It has no board of its own: Discover (S1-E5-01) and the public home page
 * (S1-E5-08) replace it. S1-E1-03 gave it the design tokens: an eyebrow, a Bricolage page title
 * and an Inter lede, sized as on the boards.
 * What it uses: translations from src/locales/<language>/common.json through react-i18next. The
 * product name inside them comes from src/config/brand.ts, so it is never typed here.
 */
import { useTranslation } from 'react-i18next';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { PageContainer } from '@/components/ui/PageContainer';

/**
 * Renders the home page in the current interface language.
 *
 * @returns a page with the product name as its main heading and a short line about the platform
 */
export function HomePage() {
  // The translation function for the current language (Romanian unless the reader changed it).
  const { t } = useTranslation();

  return (
    <PageContainer className="tmc-rise flex flex-col gap-4 pt-12 pb-7">
      {/* React places this <title> in the page's <head>, so the browser tab shows the product name. */}
      <title>{t('home.documentTitle')}</title>
      <Eyebrow>{t('home.eyebrow')}</Eyebrow>
      <h1 className="m-0 text-[clamp(36px,4.4vw,64px)] leading-[0.98] font-extrabold tracking-[-0.025em] break-words">
        {t('home.welcome')}
      </h1>
      <p className="m-0 max-w-[640px] text-lg leading-[1.6] text-body">{t('home.tagline')}</p>
      <p className="m-0 text-body">{t('home.comingSoon')}</p>
    </PageContainer>
  );
}
