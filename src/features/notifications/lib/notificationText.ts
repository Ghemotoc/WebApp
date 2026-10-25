/**
 * What one notification says and where it leads (story S1-E7-01; board 6.2).
 *
 * Who calls it: NotificationRow. It takes the translation function, so the words live in the
 * locale files (CLAUDE.md rule 4) and this file only picks which line fits.
 * Each row has: who did it ("inkwolf", "ilinca.r, corbu and 10 others", "Moderation team:"),
 * what happened, a quote when there is one, the one action and its address.
 */
import type { TFunction } from 'i18next';

import type { AppNotification } from '../api/notifications';

/** A row's words and link. */
export interface NotificationText {
  who: string;
  what: string;
  quote: string | null;
  /** The pill under a grouped row, such as "12 reactions". */
  grouped: string | null;
  actionLabel: string | null;
  href: string | null;
}

/**
 * The people part: one name, two names, or two names and how many others.
 *
 * @param t - the notifications translation function
 * @param notification - the row
 * @returns for example "corbu", "corbu and ilinca.r", "corbu, ilinca.r and 10 others"
 */
export function whoDidIt(t: TFunction, notification: AppNotification): string {
  const [first, second] = notification.actors.map((actor) => actor.displayName);
  if (first === undefined) return t('who.someone');
  if (second === undefined) return first;
  const others = notification.actorCount - 2;
  if (others <= 0) return t('who.two', { first, second });
  return t('who.many', { first, second, count: others });
}

/**
 * Where the chapter lives, for a link.
 *
 * @param notification - the row
 * @returns "/s/<story>/<chapter>", or null when the row has no chapter
 */
function chapterAddress(notification: AppNotification): string | null {
  if (notification.story === null || notification.chapter === null) return null;
  return `/s/${notification.story.slug}/${notification.chapter.code}`;
}

/**
 * "Chapter 15 of The Salt Mine Choir", the phrase most rows share.
 *
 * @param t - the notifications translation function
 * @param notification - the row
 * @returns the phrase, or the story's title alone when there is no chapter
 */
function chapterOfStory(t: TFunction, notification: AppNotification): string {
  const storyTitle = notification.story?.title ?? '';
  if (notification.chapter === null) return storyTitle;
  return t('chapterOfStory', { position: notification.chapter.position, story: storyTitle });
}

/**
 * A moderation decision's words: what was decided about which kind of item (DSA art. 17: the
 * person hears about every decision; S1-E10-04 adds the statement of reasons and the appeal).
 *
 * @param t - the notifications translation function
 * @param notification - a moderation_decision row
 * @returns the row's words
 */
function decisionText(t: TFunction, notification: AppNotification): NotificationText {
  const itemName = t(`items.${notification.item?.itemType ?? 'other'}`);
  return {
    who: t('who.moderationTeam'),
    what: t(`decisions.${notification.decision ?? 'no_action'}`, { item: itemName }),
    quote: null,
    grouped: null,
    actionLabel: notification.item?.address ? t('actions.seeIt') : null,
    href: notification.item?.address ?? null,
  };
}

/**
 * The row's words and link, by kind.
 *
 * @param t - the notifications translation function
 * @param notification - the row
 * @param ownHandle - the reader's own username, for "See who" on new followers (null if unknown)
 * @returns what the row says and where its action goes
 */
export function notificationText(
  t: TFunction,
  notification: AppNotification,
  ownHandle: string | null,
): NotificationText {
  // Step 1: a moderation decision has its own words and no people.
  if (notification.kind === 'moderation_decision') return decisionText(t, notification);
  // Step 2: every other kind starts with who did it.
  const base = {
    who: whoDidIt(t, notification),
    quote: notification.commentExcerpt,
    grouped: null,
  };
  const where = chapterOfStory(t, notification);
  // Step 3: the kind decides the words and the one action.
  switch (notification.kind) {
    case 'new_chapter':
      return {
        ...base,
        what: t('what.newChapter', { where }),
        actionLabel: t('actions.readNow'),
        href: chapterAddress(notification),
      };
    case 'comment_on_chapter':
      return {
        ...base,
        what: t('what.commentOnChapter', { where }),
        actionLabel: t('actions.openChapter'),
        href: chapterAddress(notification),
      };
    case 'comment_reply':
      return {
        ...base,
        what: t('what.commentReply', { where }),
        actionLabel: t('actions.reply'),
        href: chapterAddress(notification),
      };
    case 'comment_reactions':
      return {
        ...base,
        what: t('what.commentReactions', { where }),
        grouped:
          notification.actorCount > 1
            ? t('grouped.reactions', { count: notification.actorCount })
            : null,
        actionLabel: t('actions.openChapter'),
        href: chapterAddress(notification),
      };
    case 'new_follower':
      return followerText(t, notification, ownHandle, base);
  }
}

/**
 * A new follower, or several: "See who" opens the reader's own profile, where their followers
 * are listed; a single follower's row opens that person's profile.
 *
 * @returns the row's words
 */
function followerText(
  t: TFunction,
  notification: AppNotification,
  ownHandle: string | null,
  base: Pick<NotificationText, 'who' | 'quote' | 'grouped'>,
): NotificationText {
  const firstHandle = notification.actors[0]?.handle ?? null;
  if (notification.actorCount > 1 && ownHandle !== null) {
    return {
      ...base,
      what: t('what.newFollower'),
      actionLabel: t('actions.seeWho'),
      href: `/u/${ownHandle}`,
    };
  }
  return {
    ...base,
    what: t('what.newFollower'),
    actionLabel: firstHandle === null ? null : t('actions.seeProfile'),
    href: firstHandle === null ? null : `/u/${firstHandle}`,
  };
}
