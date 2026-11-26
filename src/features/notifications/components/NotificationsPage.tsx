/**
 * NotificationsPage: Notifications at /notifications (story S1-E7-01; user story 4.1, board
 * E11-Notifications of "Build: the full design as user stories").
 *
 * What it shows, as the board draws it: the title and "3 new since you last looked"; a row with
 * the tabs (Everything first, each with its count), "Unread only" with its switch and "Mark all
 * as read" (a quiet button); then the rows under Today, Yesterday, Earlier this week and Older,
 * with "Show older" across the column when there is more; and beside them "How you’re told" and
 * "Decisions about your posts". Columns of 1.7 : 1, 64 px apart, from 1024 px; one column below.
 * Browser alerts wait for S1-E7-03 (docs/board-fixes.md).
 * Who shows it: the router, at /notifications; the bell in the top bar links here.
 * What it calls: hooks/useNotifications.ts, hooks/useMarkNotificationsRead.ts, EmailChoicesCard
 * and DecisionsCard.
 */
import { useState } from 'react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { useMyNames } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';
import { SwitchButton } from '@/features/settings/components/SwitchButton';

import type { NotificationsPage as NotificationsPageData } from '../api/notifications';
import { useMarkNotificationsRead } from '../hooks/useMarkNotificationsRead';
import { useNotifications } from '../hooks/useNotifications';
import { useNotificationsTranslation } from '../registerNotificationsTranslations';

import { DecisionsCard } from './DecisionsCard';
import { EmailChoicesCard } from './EmailChoicesCard';
import { NotificationFilters, type NotificationFilter } from './NotificationFilters';
import { NotificationList } from './NotificationList';

/**
 * The heading block: the title and the unread line (board E11).
 *
 * @returns the page header
 */
function NotificationsHeader({ unread }: { unread: number }) {
  const { t } = useNotificationsTranslation();
  return (
    <header className="flex flex-col gap-2 pt-12">
      <h1 className="page-title">{t('page.title')}</h1>
      <p role="status" className="m-0 max-w-[34em] type-body text-ink-muted">
        {unread > 0 ? t('page.newSince', { count: unread }) : t('page.caughtUp')}
      </p>
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
      <span aria-hidden="true" className="type-body font-semibold text-ink-heading">
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
 * The row of tools over the list: the tabs, "Unread only" and "Mark all as read" (board E11).
 *
 * @returns the toolbar
 */
function NotificationsToolbar(props: {
  counts: NotificationsPageData['counts'];
  chosen: NotificationFilter;
  onChoose: (filter: NotificationFilter) => void;
  isUnreadOnly: boolean;
  onToggleUnread: () => void;
  unread: number;
  onMarkAll: () => void;
  isSaving: boolean;
}) {
  const { t } = useNotificationsTranslation();
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      <NotificationFilters counts={props.counts} chosen={props.chosen} onChoose={props.onChoose} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <UnreadOnlySwitch isOn={props.isUnreadOnly} onToggle={props.onToggleUnread} />
        <Button
          variant="secondary"
          onClick={props.onMarkAll}
          disabled={props.unread === 0 || props.isSaving}
        >
          {t('page.markAllRead')}
        </Button>
      </div>
    </div>
  );
}

/**
 * The list and the side sections, once the first page has arrived.
 *
 * @returns the header, toolbar, list and sections
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
  // Step 2: the chosen tab's rows, and only the unread ones when "Unread only" is on.
  const shown = list.notifications.filter(
    (item) => (chosen === 'all' || item.category === chosen) && (!isUnreadOnly || !item.isRead),
  );
  return (
    <div className="flex flex-col gap-16 pb-16">
      <NotificationsHeader unread={list.unread} />
      <div className="flex flex-col gap-6">
        <NotificationsToolbar
          counts={list.counts}
          chosen={chosen}
          onChoose={setChosen}
          isUnreadOnly={isUnreadOnly}
          onToggleUnread={() => setIsUnreadOnly(!isUnreadOnly)}
          unread={list.unread}
          onMarkAll={mark.markAllRead}
          isSaving={mark.isSaving}
        />
        {mark.saveFailed && <Notice tone="error">{t('page.markFailed')}</Notice>}
      </div>
      <div className="grid grid-cols-1 items-start gap-16 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-3">
          <NotificationList
            notifications={shown}
            ownHandle={names?.handle ?? null}
            onOpen={mark.markRead}
          />
          {list.hasMore && (
            <Button
              variant="secondary"
              className="w-full"
              onClick={list.loadMore}
              disabled={list.isLoadingMore}
            >
              {t('page.showOlder')}
            </Button>
          )}
        </div>
        <aside aria-label={t('page.aboutLabel')} className="flex min-w-0 flex-col gap-12">
          <EmailChoicesCard />
          <DecisionsCard />
        </aside>
      </div>
    </div>
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
        <div className="flex flex-col gap-2 pt-12 pb-16">
          <h1 className="page-title">{t('page.title')}</h1>
          <p className="m-0 text-ink-muted">
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
