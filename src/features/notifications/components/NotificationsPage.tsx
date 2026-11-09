/**
 * NotificationsPage: Notifications, screen 6.2 at /notifications (story S1-E7-01; board
 * Notifications in the liquid glass redesign, bundle G8d).
 *
 * What it shows: the eyebrow, "What's new" and "3 new since you last looked" on the left, with
 * Settings (a grey glass pill) and "Mark all as read" (the main pill) on the right; the filter
 * chips with counts and the "Unread only" switch; the list under Today, Yesterday, Earlier this
 * week and Older as glass cards; "Show older" when there is more; and beside it the email
 * choices card and the "Decisions about your posts" card.
 * Left out until their stories (docs/board-fixes.md): browser alerts and quiet hours (S1-E7-03),
 * and the data download, certificate and mention rows.
 * Who shows it: the router, at /notifications; the bell in the top bar links here.
 * What it calls: hooks/useNotifications.ts, hooks/useMarkNotificationsRead.ts, EmailChoicesCard
 * and DecisionsCard.
 */
import { useState } from 'react';
import { Link } from 'react-router';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { Button } from '@/components/ui/Button';
import { buttonClassName } from '@/components/ui/buttonStyles';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { useMyNames } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';
import { SwitchButton } from '@/features/settings/components/SwitchButton';

import { useMarkNotificationsRead } from '../hooks/useMarkNotificationsRead';
import { useNotifications } from '../hooks/useNotifications';
import { useNotificationsTranslation } from '../registerNotificationsTranslations';

import { DecisionsCard } from './DecisionsCard';
import { EmailChoicesCard } from './EmailChoicesCard';
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
    <header className="flex flex-col gap-5 pt-14 pb-7 md:flex-row md:items-end md:justify-between">
      <div className="flex max-w-[640px] flex-col gap-2">
        <Eyebrow>{t('page.eyebrow')}</Eyebrow>
        <h1 className="page-title">{t('page.title')}</h1>
        <p role="status" className="m-0 text-lg leading-relaxed text-body">
          {unread > 0 ? t('page.newSince', { count: unread }) : t('page.caughtUp')}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        {/* The board's Settings pill, to Settings › Notifications (LOOK-5; glass since G8d). */}
        <Link
          to="/settings#notifications"
          className={buttonClassName({ variant: 'secondary' }, 'shrink-0')}
        >
          <ActionIcon name="settings" />
          {t('page.settings')}
        </Link>
        <Button onClick={onMarkAll} disabled={unread === 0 || isSaving}>
          <ActionIcon name="check" />
          {t('page.markAllRead')}
        </Button>
      </div>
    </header>
  );
}

/**
 * "Unread only": a labelled switch that hides the rows already read.
 *
 * @param props.isOn - true while only unread rows show
 * @param props.onToggle - flips it
 * @returns the label and the switch
 */
function UnreadOnlySwitch({ isOn, onToggle }: { isOn: boolean; onToggle: () => void }) {
  const { t } = useNotificationsTranslation();
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden="true" className="text-[15px] font-bold text-heading">
        {t('page.unreadOnly')}
      </span>
      <SwitchButton
        label={t('page.unreadOnly')}
        isOn={isOn}
        stateWord={isOn ? t('page.switchOn') : t('page.switchOff')}
        isDisabled={false}
        onToggle={onToggle}
      />
    </div>
  );
}

/**
 * The list and the side cards, once the first page has arrived.
 *
 * @returns the filters, list and card
 */
function NotificationsBody() {
  const { t } = useNotificationsTranslation();
  const [chosen, setChosen] = useState<NotificationFilter>('all');
  const [isUnreadOnly, setIsUnreadOnly] = useState(false);
  const list = useNotifications();
  const mark = useMarkNotificationsRead();
  const { names } = useMyNames();
  // Step 1: a wait, or a plain message when the list can't be read.
  if (list.loadFailed) return <Notice tone="error">{t('page.loadFailed')}</Notice>;
  if (!list.isLoaded || list.counts === null) return null;
  // Step 2: the chosen filter's rows, and only the unread ones when "Unread only" is on.
  const shown = list.notifications.filter(
    (item) => (chosen === 'all' || item.category === chosen) && (!isUnreadOnly || !item.isRead),
  );
  return (
    <>
      <NotificationsHeader
        unread={list.unread}
        onMarkAll={mark.markAllRead}
        isSaving={mark.isSaving}
      />
      {mark.saveFailed && <Notice tone="error">{t('page.markFailed')}</Notice>}
      <div className="mb-7 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <NotificationFilters counts={list.counts} chosen={chosen} onChoose={setChosen} />
        <UnreadOnlySwitch isOn={isUnreadOnly} onToggle={() => setIsUnreadOnly(!isUnreadOnly)} />
      </div>
      <div className="flex flex-wrap items-start gap-7 pb-16">
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
          className="flex min-w-0 flex-[1_1_300px] flex-col gap-5"
        >
          <EmailChoicesCard />
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
        <div className="flex flex-col gap-2 pt-14 pb-16">
          <Eyebrow>{t('page.eyebrow')}</Eyebrow>
          <h1 className="page-title">{t('page.title')}</h1>
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
