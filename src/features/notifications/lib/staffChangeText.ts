/**
 * What a "story_changed_by_staff" notification says (bundle ADMIN-2, part b1; story S1-E11-08
 * criterion 4): staff changed something about the writer's story that restricts nothing, such as
 * a corrected category or tag, comments switched, the story or a chapter shown again, or a removed
 * passage put back by Restore (bundle ADMIN-2, part b2). The row
 * says what changed and quotes why; it never names the staff member. It leads to the story's
 * settings, where the writer can change it back or write to the moderators.
 *
 * Who calls it: notificationText.ts (teamTextFor). The words live in the notifications locale
 * files (CLAUDE.md rule 4).
 */
import type { TFunction } from 'i18next';

import type { AppNotification } from '../api/notifications';

import type { NotificationText } from './notificationText';

/**
 * The changed settings as one readable list, for example "the category and the tags" (no comma
 * before "and", as the house style asks).
 *
 * @param t - the notifications translation function
 * @param fields - the changed field names
 * @returns the list
 */
function changedFieldsList(t: TFunction, fields: string[]): string {
  const names = fields.map((field) => t(`staffChangeFields.${field}`, { defaultValue: field }));
  const last = names.pop();
  if (last === undefined) return t('staffChangeFields.settings');
  if (names.length === 0) return last;
  return t('staffChangeFields.list', { first: names.join(', '), last });
}

/**
 * What happened, in one line.
 *
 * @param t - the notifications translation function
 * @param notification - a story_changed_by_staff row
 * @returns the line
 */
function whatChanged(t: TFunction, notification: AppNotification): string {
  const story = notification.story?.title ?? t('staffChangeFields.yourStory');
  const change = notification.staffChange;
  const chapterNumber = notification.chapter?.position ?? 0;
  if (change?.fields.includes('passage') === true) {
    return t('what.staffPutBackPassage', { number: chapterNumber, story });
  }
  if (change?.visibility === 'shown' && notification.chapter !== null) {
    return t('what.staffShowedChapter', { number: chapterNumber, story });
  }
  if (change?.visibility === 'shown') return t('what.staffShowedStory', { story });
  const fields = changedFieldsList(t, change?.fields ?? []);
  return t('what.staffChangedStory', { fields, story });
}

/**
 * The row's words and link.
 *
 * @param t - the notifications translation function
 * @param notification - a story_changed_by_staff row
 * @returns the row's words
 */
export function staffChangeText(t: TFunction, notification: AppNotification): NotificationText {
  const slug = notification.story?.slug ?? null;
  return {
    who: t('who.moderationTeam'),
    what: whatChanged(t, notification),
    quote: notification.staffChange?.reasonText ?? null,
    grouped: null,
    actionLabel: slug === null ? null : t('actions.openStorySettings'),
    href: slug === null ? null : `/write/s/${slug}/settings`,
  };
}
