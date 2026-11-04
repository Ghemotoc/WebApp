/**
 * What the "You're now a Storyteller" notification says (bundle IDEAS-3, part a; idea
 * IDEA-20261102-1).
 *
 * A writer gets this one quiet row the first time they reach a rank (refresh_writer_rank() in
 * supabase/migrations/…_ideas3_a_ranks.sql). It names the rank and leads to their own profile,
 * where the rank panel shows the ladder. The row's icon is the rank's sticker (NotificationIcon).
 * Who calls it: notificationText.ts, through its table of kinds with words of their own.
 */
import type { TFunction } from 'i18next';

import type { AppNotification } from '../api/notifications';

import type { NotificationText } from './notificationText';

/**
 * The words of a rank_reached row.
 *
 * @param t - the notifications translation function
 * @param notification - the row; writerRank is the rank reached and ownHandle the writer's handle
 * @returns the row's words and the link to the writer's own profile
 */
export function rankReachedText(t: TFunction, notification: AppNotification): NotificationText {
  // Step 1: the rank's name in the reader's language (the same names as the profile's pill).
  const rank = notification.writerRank === null ? '' : t(`rankNames.${notification.writerRank}`);
  // Step 2: the link goes to the writer's own profile, when the handle came with the row.
  const handle = notification.ownHandle;
  return {
    who: t('who.rank'),
    what: t('what.rankReached', { rank }),
    quote: null,
    grouped: null,
    actionLabel: handle === null ? null : t('actions.seeMyRank'),
    href: handle === null ? null : `/u/${handle}`,
  };
}
