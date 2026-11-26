/**
 * UnsubscribePage: /unsubscribe?key=…, the page behind the link at the foot of every optional
 * notification email (story S1-E7-02; criterion 2).
 *
 * Why a button and not at once: mail scanners open links to check them, so opening the page
 * changes nothing; one press stops the emails. Mail apps that support it use the email's
 * List-Unsubscribe header instead, which needs no page (POST /api/unsubscribe, RFC 8058).
 * It works signed out: the key in the link says whose emails stop. Account, safety and legal
 * emails always arrive. No doodles: a plain safety page. Drawn as board J28 (user stories, bundle
 * 10): one centred card (NoticeCard) with the heading, the line, the button and the answer.
 * Who shows it: the router. What it calls: api/emailSettings.ts → unsubscribe_from_emails().
 */
import { useMutation } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { NoticeCard } from '@/components/ui/NoticeCard';
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
    <NoticeCard
      heading={t('unsubscribe.heading')}
      headingId="unsubscribe-heading"
      documentTitle={t('unsubscribe.documentTitle')}
    >
      <p className="m-0 type-body text-ink-muted">{t('unsubscribe.intro')}</p>
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
          <div aria-live="polite" className="w-full">
            <UnsubscribeResult result={result} />
          </div>
        </>
      )}
    </NoticeCard>
  );
}
