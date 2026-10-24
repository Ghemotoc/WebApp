/**
 * PublicNoticesPanel: on the queue page, the removal orders received in the last seven days (the
 * logged on-call alert; the phone alert comes with S1-E10-09) and the public notices whose
 * address matched nothing we host, for a person to check and close with a note (story S1-E10-02;
 * Regulation (EU) 2021/784 art. 3(3): act within one hour). Needs the lawyer's review before
 * launch.
 *
 * Shows nothing when both lists are empty, and an error when either can't be read. Plain staff components, no doodles.
 * Who shows it: ModerationQueuePage. What it calls: useQueueNotices.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import type { OnCallAlert, UnmatchedNotice } from '../api/publicNotices';
import { useNow } from '../hooks/useNow';
import { useQueueNotices } from '../hooks/usePublicNotices';

import { ReasonForm } from './ReasonForm';

/** How far back the orders list looks. */
const recentOrderDays = 7;

/** queue.close and its state, passed down once. */
type QueueNotices = ReturnType<typeof useQueueNotices>;

/**
 * A time in Romania time, as the order's acknowledgement writes it.
 *
 * @returns a function from an ISO time to the text
 */
function useRomaniaTime() {
  const { i18n } = useTranslation();
  const format = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Bucharest',
  });
  return (isoTime: string) => format.format(new Date(isoTime));
}

/**
 * The orders received in the last seven days, each linking to its case.
 *
 * @returns the list, or nothing when there are none
 */
function RecentOrders({ alerts }: { alerts: OnCallAlert[] }) {
  const { t } = useTranslation('moderation');
  const timeOf = useRomaniaTime();
  const now = useNow();
  const since = now.getTime() - recentOrderDays * 24 * 60 * 60 * 1000;
  const recent = alerts.filter((alert) => new Date(alert.createdAt).getTime() >= since);
  if (recent.length === 0) return null;
  return (
    <section aria-labelledby="queue-orders-heading" className="flex flex-col gap-2">
      <h2 id="queue-orders-heading" className="m-0 font-heading text-xl font-bold text-heading">
        {t('notices.ordersHeading')}
      </h2>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {recent.map((alert) => (
          <li key={alert.id} className="text-body">
            {t('notices.orderAlert', {
              reference: alert.noticeReference ?? '',
              when: timeOf(alert.createdAt),
            })}{' '}
            {alert.caseId === null ? (
              t('notices.orderUnmatched')
            ) : (
              <Link to={`/staff/moderation/cases/${alert.caseId}`} className="text-link underline">
                {t('notices.openCase', { reference: alert.caseReference ?? '' })}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * One unmatched notice, with Close and its note.
 *
 * @returns a list item
 */
function UnmatchedCard({ notice, queue }: { notice: UnmatchedNotice; queue: QueueNotices }) {
  const { t } = useTranslation('moderation');
  const timeOf = useRomaniaTime();
  const [isClosing, setIsClosing] = useState(false);
  const title =
    notice.kind === 'removal_order'
      ? t('notices.orderFrom', {
          authority: notice.authorityName ?? '',
          orderReference: t('notices.noOrderReference'),
        })
      : t(`reasons.${notice.reason ?? 'other'}`);
  return (
    <li className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4">
      <p className="m-0 font-semibold text-heading">
        {notice.reference} · {title}
      </p>
      <p className="m-0 text-sm text-meta">
        {notice.deadlineAt === null
          ? t('notices.receivedAt', { when: timeOf(notice.receivedAt) })
          : t('notices.actBy', { when: timeOf(notice.deadlineAt) })}
      </p>
      <code className="text-sm break-all text-body">{notice.contentUrl}</code>
      <p className="m-0 text-body whitespace-pre-line">{notice.explanation}</p>
      {isClosing ? (
        <ReasonForm
          id={`close-${notice.reference}`}
          label={t('notices.closeNote')}
          confirmLabel={t('notices.closeConfirm')}
          isBusy={queue.isClosing}
          onConfirm={async (note) => {
            await queue.close(notice.id, note);
            setIsClosing(false);
          }}
          onCancel={() => setIsClosing(false)}
        />
      ) : (
        <div>
          <Button
            variant="secondary"
            aria-label={t('notices.closeLabel', { reference: notice.reference })}
            onClick={() => setIsClosing(true)}
          >
            {t('notices.close')}
          </Button>
        </div>
      )}
    </li>
  );
}

/**
 * Renders the panel.
 *
 * @returns the orders and the unmatched notices, or nothing when both are empty
 */
export function PublicNoticesPanel() {
  const { t } = useTranslation('moderation');
  const queue = useQueueNotices();
  // A refusal for someone outside moderation is the queue's own message; anything else shows here.
  if (queue.loadFailure !== null && queue.loadFailure !== 'not_allowed') {
    return <Notice tone="error">{t(`failures.${queue.loadFailure}`)}</Notice>;
  }
  if (queue.alerts.length === 0 && queue.unmatched.length === 0) return null;
  return (
    <div className="flex max-w-[1100px] flex-col gap-6">
      <RecentOrders alerts={queue.alerts} />
      {queue.unmatched.length > 0 && (
        <section aria-labelledby="queue-unmatched-heading" className="flex flex-col gap-3">
          <h2
            id="queue-unmatched-heading"
            className="m-0 font-heading text-xl font-bold text-heading"
          >
            {t('notices.unmatchedHeading')}
          </h2>
          <p className="m-0 text-body">{t('notices.unmatchedIntro')}</p>
          {queue.closeFailure !== null && (
            <Notice tone="error">{t(`failures.${queue.closeFailure}`)}</Notice>
          )}
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {queue.unmatched.map((notice) => (
              <UnmatchedCard key={notice.id} notice={notice} queue={queue} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
