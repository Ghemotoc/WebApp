/**
 * UnsubscribePage: /unsubscribe?key=…, the page behind the link at the foot of every optional
 * notification email (story S1-E7-02; criterion 2).
 *
 * Why a button and not at once: mail scanners open links to check them, so opening the page
 * changes nothing; one press stops the emails. Mail apps that support it use the email's
 * List-Unsubscribe header instead, which needs no page (POST /api/unsubscribe, RFC 8058).
 * It works signed out: the key in the link says whose emails stop. Account, safety and legal
 * emails always arrive. No doodles: a plain safety page.
 * Who shows it: the router. What it calls: api/emailSettings.ts → unsubscribe_from_emails().
 */
import { useMutation } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { requireClient } from '@/features/account/hooks/useMyNames';

import { unsubscribeFromEmails } from '../api/emailSettings';
import { useNotificationsTranslation } from '../registerNotificationsTranslations';

/** The answer under the button once it was pressed, or nothing before. */
function UnsubscribeResult({ result }: { result: ReturnType<typeof useUnsubscribe> }) {
  const { t } = useNotificationsTranslation();
  if (result.isError) return <Notice tone="error">{t('unsubscribe.failed')}</Notice>;
  if (result.data === false) return <Notice tone="error">{t('unsubscribe.unknown')}</Notice>;
  if (result.data !== true) return null;
  return (
    <Notice tone="success">
      {t('unsubscribe.done')}{' '}
      <Link to="/settings#notifications" className="text-link underline">
        {t('unsubscribe.settingsLink')}
      </Link>
    </Notice>
  );
}

/** Stops the emails for the key in the link. */
function useUnsubscribe() {
  return useMutation({
    mutationFn: async (unsubscribeKey: string) =>
      unsubscribeFromEmails(await requireClient(), unsubscribeKey),
  });
}

/**
 * Renders the page.
 *
 * @returns the unsubscribe page
 */
export function UnsubscribePage() {
  const { t } = useNotificationsTranslation();
  const [searchParams] = useSearchParams();
  const unsubscribeKey = searchParams.get('key') ?? '';
  const result = useUnsubscribe();
  const isDone = result.data === true;
  return (
    <PageContainer className="tmc-rise flex max-w-[640px] flex-col gap-5 pt-12 pb-7">
      <title>{t('unsubscribe.documentTitle')}</title>
      <div className="flex flex-col gap-2">
        <Eyebrow>{t('unsubscribe.eyebrow')}</Eyebrow>
        <h1 className="m-0 font-heading text-[34px] font-bold text-heading">
          {t('unsubscribe.heading')}
        </h1>
      </div>
      <p className="m-0 text-body">{t('unsubscribe.intro')}</p>
      {unsubscribeKey === '' ? (
        <Notice tone="error">{t('unsubscribe.missingKey')}</Notice>
      ) : (
        <>
          {!isDone && (
            <Button
              className="self-start"
              disabled={result.isPending}
              onClick={() => result.mutate(unsubscribeKey)}
            >
              {result.isPending ? t('unsubscribe.working') : t('unsubscribe.button')}
            </Button>
          )}
          {/* A polite live region, so a screen reader hears the answer after the press. */}
          <div aria-live="polite">
            <UnsubscribeResult result={result} />
          </div>
        </>
      )}
    </PageContainer>
  );
}
