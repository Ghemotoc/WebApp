/**
 * NotFoundPage: "We can't find that page", for any address the app doesn't know (story S1-E2-QA,
 * from Robert's staging check, 17 Oct 2026; the glass look and copy in G5b, board NotFound).
 *
 * Centred, as on the board: a decorative glass orb, the "Error 404" eyebrow, the heading, one line
 * and two ways on: "Search {{productName}}" (the main button) and "Go to Discover" (grey glass).
 * Who shows it: the router's catch-all route (src/app/router.tsx).
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { SearchIcon } from '@/components/icons/SearchIcon';
import { buttonClassName } from '@/components/ui/buttonStyles';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { PageContainer } from '@/components/ui/PageContainer';
import { brand } from '@/config/brand';

/**
 * Renders the page.
 *
 * @returns the "page not found" section
 */
export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <PageContainer className="tmc-rise flex justify-center pt-12 pb-10">
      <title>{t('notFound.documentTitle')}</title>
      <section
        aria-labelledby="not-found-heading"
        className="flex w-full max-w-[820px] flex-col items-center gap-5 text-center"
      >
        {/* The orb is decoration only: the eyebrow and heading say it in words. */}
        <div
          aria-hidden="true"
          className="flex size-[clamp(104px,18vw,150px)] items-center justify-center rounded-full border border-glass-border bg-linear-to-b from-plum-from to-plum-to text-on-plum shadow-card"
        >
          <SearchIcon size={56} />
        </div>
        <Eyebrow>{t('notFound.eyebrow')}</Eyebrow>
        <h1
          id="not-found-heading"
          className="m-0 font-heading text-[clamp(32px,5vw,56px)] leading-[1.05] font-extrabold text-heading"
        >
          {t('notFound.heading')}
        </h1>
        <p className="m-0 max-w-[600px] text-lg text-body">{t('notFound.body')}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/search" className={buttonClassName({ size: 'lg' })}>
            <SearchIcon size={18} />
            {t('notFound.search', { productName: brand.productName })}
          </Link>
          <Link to="/discover" className={buttonClassName({ variant: 'secondary', size: 'lg' })}>
            {t('notFound.goDiscover')}
          </Link>
        </div>
      </section>
    </PageContainer>
  );
}
