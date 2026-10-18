/**
 * NotFoundPage: "We can't find that page", for any address the app doesn't know (story S1-E2-QA,
 * from Robert's staging check, 17 Oct 2026; the copy is board 7.4, States, card 1).
 *
 * Before this, an unknown address sent people to the home page without a word. This is the small
 * March version: the heading, one line and "Go to Home". It stays this way for now (S1-E1-05,
 * 18 Oct 2026): the board's search button waits for Search (S1-E5-04), and its doodles for the
 * story that sets up doodles with token colours.
 * Who shows it: the router's catch-all route (src/app/router.tsx).
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { PageContainer } from '@/components/ui/PageContainer';

/**
 * Renders the page.
 *
 * @returns the "page not found" card
 */
export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <PageContainer className="tmc-rise flex justify-center pt-12 pb-7">
      <title>{t('notFound.documentTitle')}</title>
      <section
        aria-labelledby="not-found-heading"
        className="flex w-full max-w-[560px] flex-col items-start gap-3.5 rounded-card border border-border bg-surface p-[clamp(20px,5vw,32px)] shadow-card"
      >
        {/* The big number is decoration; the heading says it in words. */}
        <span
          aria-hidden="true"
          className="font-heading text-[72px] leading-[0.9] font-extrabold tracking-[-0.03em] text-heading"
        >
          404
        </span>
        <h1 id="not-found-heading" className="m-0 font-heading text-[28px] font-bold text-ink">
          {t('notFound.heading')}
        </h1>
        <p className="m-0 text-base text-body">{t('notFound.body')}</p>
        <Link
          to="/"
          className="inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-on-primary no-underline hover:opacity-90"
        >
          {t('notFound.goHome')}
        </Link>
      </section>
    </PageContainer>
  );
}
