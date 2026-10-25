/**
 * NotificationsPage: Notifications, screen 6.2 at /notifications (story S1-E7-01;
 * design/boards/Notifications.dc.html).
 *
 * What it shows: the eyebrow, "What's new", "3 new since you last looked", "Mark all as read",
 * the filter chips with counts, the list under Today, Yesterday, Earlier this week and Older,
 * "Show older" when there is more, and the "Decisions about your posts" card.
 * Left out until their stories (docs/board-fixes.md): the board's Settings link and "Your
 * choices" card (S1-E7-02), "Unread only", and the data download, certificate and mention rows.
 * Who shows it: the router, at /notifications; the bell in the top bar links here.
 * What it calls: hooks/useNotifications.ts and hooks/useMarkNotificationsRead.ts.
 */
import { useState } from 'react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { useMyNames } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import { useMarkNotificationsRead } from '../hooks/useMarkNotificationsRead';
import { useNotifications } from '../hooks/useNotifications';
import { useNotificationsTranslation } from '../registerNotificationsTranslations';

import { DecisionsCard } from './DecisionsCard';
import { NotificationFilters, type NotificationFilter } from './NotificationFilters';
import { NotificationList } from './NotificationList';

/**
 * The heading block: eyebrow, title, the unread line and "Mark all as read".
 *
 * @returns the page header
 */
function NotificationsHeader({
  unread,
  onMarkAll,
  isSaving,
}: {
  unread: number;
  onMarkAll: () => void;
  isSaving: boolean;
}) {
  const { t } = useNotificationsTranslation();
  return (
    <header className="flex flex-wrap items-end justify-between gap-6 pt-14 pb-7">
      <div className="flex flex-col gap-4">
        <Eyebrow>{t('page.eyebrow')}</Eyebrow>
        <h1 className="m-0 text-[clamp(36px,4.4vw,64px)] leading-[0.98] font-extrabold tracking-[-0.025em]">
          {t('page.title')}
        </h1>
        <p role="status" className="m-0 text-lg leading-relaxed text-body">
          {unread > 0 ? t('page.newSince', { count: unread }) : t('page.caughtUp')}
        </p>
      </div>
      <Button size="lg" onClick={onMarkAll} disabled={unread === 0 || isSaving}>
        {t('page.markAllRead')}
      </Button>
    </header>
  );
}

/**
 * The list and the side card, once the first page has arrived.
 *
 * @returns the filters, list and card
 */
function NotificationsBody() {
  const { t } = useNotificationsTranslation();
  const [chosen, setChosen] = useState<NotificationFilter>('all');
  const list = useNotifications();
  const mark = useMarkNotificationsRead();
  const { names } = useMyNames();
  // Step 1: a wait, or a plain message when the list can't be read.
  if (list.loadFailed) return <Notice tone="error">{t('page.loadFailed')}</Notice>;
  if (!list.isLoaded || list.counts === null) return null;
  // Step 2: the chosen filter's rows.
  const shown = list.notifications.filter((item) => chosen === 'all' || item.category === chosen);
  return (
    <>
      <NotificationsHeader
        unread={list.unread}
        onMarkAll={mark.markAllRead}
        isSaving={mark.isSaving}
      />
      {mark.saveFailed && <Notice tone="error">{t('page.markFailed')}</Notice>}
      <div className="mb-6">
        <NotificationFilters counts={list.counts} chosen={chosen} onChoose={setChosen} />
      </div>
      <div className="flex flex-wrap items-start gap-8 pb-16">
        <div className="flex min-w-0 flex-[999_1_600px] flex-col gap-7">
          <NotificationList
            notifications={shown}
            ownHandle={names?.handle ?? null}
            onOpen={mark.markRead}
          />
          {list.hasMore && (
            <Button
              variant="secondary"
              className="self-start"
              onClick={list.loadMore}
              disabled={list.isLoadingMore}
            >
              {t('page.showOlder')}
            </Button>
          )}
        </div>
        <aside
          aria-label={t('page.aboutLabel')}
          className="flex min-w-0 flex-[1_1_320px] flex-col gap-5"
        >
          <DecisionsCard />
        </aside>
      </div>
    </>
  );
}

/**
 * Renders the page: the list when signed in, a log-in line when not.
 *
 * @returns the page
 */
export function NotificationsPage() {
  const { t } = useNotificationsTranslation();
  const { userId, isKnown } = useSession();
  return (
    <PageContainer>
      {isKnown && userId === null && (
        <div className="flex flex-col gap-4 pt-14 pb-16">
          <Eyebrow>{t('page.eyebrow')}</Eyebrow>
          <h1 className="m-0 text-[clamp(36px,4.4vw,64px)] leading-[0.98] font-extrabold">
            {t('page.title')}
          </h1>
          <p className="m-0 text-body">
            {t('page.signedOut')}{' '}
            <Link to="/sign-in" className="text-link underline">
              {t('page.logIn')}
            </Link>
          </p>
        </div>
      )}
      {userId !== null && <NotificationsBody />}
    </PageContainer>
  );
}
