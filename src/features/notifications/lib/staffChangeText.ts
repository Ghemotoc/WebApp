/**
 * What a "story_changed_by_staff" notification says (bundle ADMIN-2, part b1; story S1-E11-08
 * criterion 4): staff changed something about the writer's story that restricts nothing, such as
 * a corrected category or tag, comments switched, the story or a chapter shown again, or a removed
 * passage put back by Restore (bundle ADMIN-2, part b2), or a hidden title or cover shown again
 * (part b3). The row
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
 * The line for a change that brought something back: a removed passage put back, a hidden title
 * or cover shown again, or the story or one chapter shown again; null for any other change.
 *
 * @param t - the notifications translation function
 * @param notification - a story_changed_by_staff row
 * @param story - the story's title, or "your story"
 * @returns the line, or null
 */
function broughtBackLine(t: TFunction, notification: AppNotification, story: string) {
  const change = notification.staffChange;
  const number = notification.chapter?.position ?? 0;
  if (change === null) return null;
  if (change.fields.includes('passage')) return t('what.staffPutBackPassage', { number, story });
  // Part b3: a title or cover hidden from readers is shown again (hiding sends a statement).
  if (change.fields.includes('title')) return t('what.staffShowedTitle', { story });
  if (change.fields.includes('cover')) return t('what.staffShowedCover', { story });
  if (change.visibility !== 'shown') return null;
  if (notification.chapter !== null) return t('what.staffShowedChapter', { number, story });
  return t('what.staffShowedStory', { story });
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
  const broughtBack = broughtBackLine(t, notification, story);
  if (broughtBack !== null) return broughtBack;
  const fields = changedFieldsList(t, notification.staffChange?.fields ?? []);
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
