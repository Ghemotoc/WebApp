/**
 * ErrorPage: "Something went wrong on our side", shown when a page fails to draw (story S1-E1-05;
 * board 7.4, States, card 4).
 *
 * Who shows it: the router (src/app/router.tsx) as the error element, inside the normal frame for
 * a failed page and on its own when the frame itself fails.
 * What it calls: hooks/useReportedErrorCode.ts, which sends the scrubbed error to our own error
 * log and answers with a short code to quote to support. The page says what is sent and what never
 * is (GDPR art. 13, transparency; board 7.4).
 * Board differences: no storm-cloud picture (the app has no doodles), and
 * the code shows only when the report was stored.
 * A page whose code file belongs to an older release (a tab opened before a release) reloads once
 * by itself instead, through hooks/useStaleBuildReload.ts, and nothing is reported (BUGS thread,
 * 26 Nov 2026). If the reload doesn't help, this page shows as usual.
 */
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useParams, useRouteError } from 'react-router';

import { Button } from '@/components/ui/Button';
import { InfoPill } from '@/components/ui/InfoPill';
import { PageContainer } from '@/components/ui/PageContainer';

import { useReportedErrorCode } from '../hooks/useReportedErrorCode';
import { useStaleBuildReload } from '../hooks/useStaleBuildReload';
import { routePattern } from '../lib/routePattern';

/**
 * Renders the page and reports the error.
 *
 * @returns the "something went wrong" card
 */
export function ErrorPage() {
  const { t } = useTranslation();
  const thrown = useRouteError();
  const pattern = routePattern(useLocation().pathname, useParams());
  // Step 1: an older release's missing file reloads the page once, and draws nothing meanwhile.
  const isReloading = useStaleBuildReload(thrown);
  // Step 2: any other error is reported, and its code shown to quote to support.
  const errorCode = useReportedErrorCode(thrown, pattern, isReloading);
  if (isReloading) return null;

  return (
    <PageContainer className="flex justify-center pt-12 pb-6">
      <title>{t('errorPage.documentTitle')}</title>
      <section
        aria-labelledby="error-page-heading"
        className="flex w-full max-w-[560px] flex-col items-start gap-4 rounded-card border border-border bg-surface p-4 lg:p-8 shadow-card"
      >
        <h1 id="error-page-heading" className="m-0 font-heading type-heading font-bold text-ink">
          {t('errorPage.heading')}
        </h1>
        <p className="m-0 type-body text-ink-muted">{t('errorPage.body')}</p>
        {errorCode !== null && (
          <InfoPill tone="neutral">
            <span className="font-mono">{t('errorPage.code', { code: errorCode })}</span>
          </InfoPill>
        )}
        <div className="flex flex-wrap items-center gap-3">
          {/* A fresh load also fetches a newer build, which fixes most errors after a release. */}
          <Button size="lg" onClick={() => window.location.reload()}>
            {t('errorPage.tryAgain')}
          </Button>
          <a
            href="/"
            className="inline-flex h-12 items-center rounded-full button-glass px-6 type-body font-semibold no-underline"
          >
            {t('errorPage.goHome')}
          </a>
          <Link
            to="/legal/contact"
            className="inline-flex min-h-12 items-center px-2 type-body font-semibold text-link hover:text-link-hover"
          >
            {t('errorPage.contactUs')}
          </Link>
        </div>
        <p className="m-0 mt-1 w-full rounded-card border border-dashed border-dashed-border px-4 py-4 type-body leading-normal text-ink-muted">
          <b className="text-ink">{t('errorPage.whatWeSendLabel')}</b> {t('errorPage.whatWeSend')}
        </p>
      </section>
    </PageContainer>
  );
}
