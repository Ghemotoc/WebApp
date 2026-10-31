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
 * What was decided, in words: the statement's action for a decision outside a case, otherwise the
 * case's decision about its kind of item.
 *
 * @param t - the notifications translation function
 * @param notification - a moderation_decision row
 * @returns the sentence
 */
function decisionWhat(t: TFunction, notification: AppNotification): string {
  if (notification.decision === null && notification.statement !== null) {
    return t(`statementDecisions.${notification.statement.action}`);
  }
  const itemName = t(`items.${notification.item?.itemType ?? 'other'}`);
  return t(`decisions.${notification.decision ?? 'no_action'}`, { item: itemName });
}

/**
 * A moderation decision's words: what was decided about which kind of item (DSA art. 17: the
 * person hears about every decision), and "Read why", which opens the statement of reasons on My
 * reports and decisions (S1-E10-04). A decision outside a case (a sanction from the account page,
 * a raised rating) has no item, so its words come from the statement's action.
 *
 * @param t - the notifications translation function
 * @param notification - a moderation_decision row
 * @returns the row's words
 */
function decisionText(t: TFunction, notification: AppNotification): NotificationText {
  const what = decisionWhat(t, notification);
  if (notification.statement !== null) {
    return {
      who: t('who.moderationTeam'),
      what,
      quote: null,
      grouped: null,
      actionLabel: t('actions.readWhy'),
      href: `/my-reports#${notification.statement.reference}`,
    };
  }
  return {
    who: t('who.moderationTeam'),
    what,
    quote: null,
    grouped: null,
    actionLabel: notification.item?.address ? t('actions.seeIt') : null,
    href: notification.item?.address ?? null,
  };
}

/**
 * A report's outcome, for the person who sent it (S1-E10-04 criterion 2; DSA art. 16(5)): what
 * came of it in plain words, never which sanction someone else got.
 *
 * @param t - the notifications translation function
 * @param notification - a report_outcome row
 * @returns the row's words
 */
function reportOutcomeText(t: TFunction, notification: AppNotification): NotificationText {
  return {
    who: t('who.moderationTeam'),
    what: t(`reportOutcomes.${notification.outcome ?? 'acted'}`, {
      reference: notification.reportReference ?? '',
    }),
    quote: null,
    grouped: null,
    actionLabel: t('actions.seeMyReports'),
    href: '/my-reports',
  };
}

/**
 * An appeal's outcome (S1-E10-07; DSA art. 20(5)): whether the decision stands or was changed,
 * with "Read why", which opens the statement on My reports and decisions.
 *
 * @param t - the notifications translation function
 * @param notification - an appeal_decided row
 * @returns the row's words
 */
function appealText(t: TFunction, notification: AppNotification): NotificationText {
  const appeal = notification.appeal;
  return {
    who: t('who.moderationTeam'),
    what: t(`appealOutcomes.${appeal?.outcome ?? 'upheld'}`, {
      reference: appeal?.reference ?? '',
    }),
    quote: null,
    grouped: null,
    actionLabel: t('actions.readWhy'),
    href: appeal === null ? '/my-reports' : `/my-reports#${appeal.statementReference}`,
  };
}

/**
 * The moderation team answered the person's message (S1-E10-11): the subject as the quote and a
 * link to the thread. It never says who on the team wrote.
 *
 * @param t - the notifications translation function
 * @param notification - a moderator_mail_reply row
 * @returns the row's words
 */
function mailReplyText(t: TFunction, notification: AppNotification): NotificationText {
  const mail = notification.mail;
  return {
    who: t('who.moderationTeam'),
    what: t('what.mailReply'),
    quote: mail?.subject ?? null,
    grouped: null,
    actionLabel: t('actions.readReply'),
    href: mail === null ? '/moderator-mail' : `/moderator-mail/${mail.reference}`,
  };
}

/**
 * Staff took a new tag off the writer's story because they didn't approve it (CMS-1e; Robert,
 * 30 Oct 2026: "the writer is told"). It names the story, never the member of staff, and links to
 * the story's settings so the writer can pick another tag.
 *
 * @param t - the notifications translation function
 * @param notification - a tag_rejected row
 * @returns the row's words
 */
function tagRejectedText(t: TFunction, notification: AppNotification): NotificationText {
  const story = notification.story;
  return {
    who: t('who.moderationTeam'),
    what: t('what.tagRejected', { title: story?.title ?? '' }),
    quote: null,
    grouped: null,
    actionLabel: t('actions.editTags'),
    href: story === null ? '/write' : `/write/s/${story.slug}/settings`,
  };
}

/**
 * Staff decided the person's manual age check (S1-E2-08b). It never says who decided; the result
 * and the reason are on the age check page.
 *
 * @param t - the notifications translation function
 * @returns the row's words
 */
function ageCheckDecidedText(t: TFunction): NotificationText {
  return {
    who: t('who.moderationTeam'),
    what: t('what.ageCheckDecided'),
    quote: null,
    grouped: null,
    actionLabel: t('actions.seeResult'),
    href: '/age-check',
  };
}

/**
 * The person's year of birth now says 18 or over while they hold only "13 or over" (S1-E2-08b,
 * criterion 10): an invitation to take an "18 or over" check.
 *
 * @param t - the notifications translation function
 * @returns the row's words
 */
function adultInviteText(t: TFunction): NotificationText {
  return {
    who: t('who.moderationTeam'),
    what: t('what.ageCheck18Invite'),
    quote: null,
    grouped: null,
    actionLabel: t('actions.checkMyAge'),
    href: '/age-check',
  };
}

/**
 * A parent or guardian agreed or withdrew their consent (S1-E2-03, criteria 2 and 5). Both lead
 * to the writer's consent page, which says what the account can do now.
 *
 * @param t - the notifications translation function
 * @param notification - the row; its kind says which
 * @returns the row's words
 */
function parentConsentText(t: TFunction, notification: AppNotification): NotificationText {
  const isAgreed = notification.kind === 'parental_consent_agreed';
  return {
    who: t('who.parentOrGuardian'),
    what: isAgreed ? t('what.parentConsentAgreed') : t('what.parentConsentWithdrawn'),
    quote: null,
    grouped: null,
    actionLabel: t('actions.seeMyAccount'),
    href: '/parent-consent',
  };
}

/**
 * A way to log in was connected or disconnected (S1-E2-09, criterion 4). The row never says which
 * one, so it reads the same whoever looks at the screen; Settings › Ways to log in lists them.
 *
 * @param t - the notifications translation function
 * @param notification - the row; its kind says which
 * @returns the row's words
 */
function loginMethodText(t: TFunction, notification: AppNotification): NotificationText {
  const isAdded = notification.kind === 'login_method_added';
  return {
    who: t('who.yourAccount'),
    what: isAdded ? t('what.loginMethodAdded') : t('what.loginMethodRemoved'),
    quote: null,
    grouped: null,
    actionLabel: t('actions.seeWaysToLogIn'),
    href: '/settings#ways-to-log-in',
  };
}

/**
 * The Teacher badge request was decided (approved or turned down), or staff removed the badge
 * (S1-E2-11, criteria 6 and 8). The row leads to Settings › Teacher badge, which shows the
 * outcome, the team's reason and how to try again.
 *
 * @param t - the notifications translation function
 * @param notification - the row; its kind says which
 * @returns the row's words
 */
function teacherBadgeText(t: TFunction, notification: AppNotification): NotificationText {
  // A .edu.ro address is approved without anyone on the team, so a decision comes from "Your
  // account"; only a removal is always the team's.
  const isDecided = notification.kind === 'teacher_check_decided';
  return {
    who: isDecided ? t('who.yourAccount') : t('who.moderationTeam'),
    what: isDecided ? t('what.teacherCheckDecided') : t('what.teacherBadgeRemoved'),
    quote: null,
    grouped: null,
    actionLabel: t('actions.seeTeacherBadge'),
    href: '/settings#teacher-badge',
  };
}

/** The moderation team's kinds and the function that words each one. */
const teamTextFor: Partial<
  Record<AppNotification['kind'], (t: TFunction, notification: AppNotification) => NotificationText>
> = {
  moderation_decision: decisionText,
  report_outcome: reportOutcomeText,
  appeal_decided: appealText,
  moderator_mail_reply: mailReplyText,
  tag_rejected: tagRejectedText,
  age_check_decided: ageCheckDecidedText,
  age_check_18_invite: adultInviteText,
  parental_consent_agreed: parentConsentText,
  parental_consent_withdrawn: parentConsentText,
  login_method_added: loginMethodText,
  login_method_removed: loginMethodText,
  teacher_check_decided: teacherBadgeText,
  teacher_badge_removed: teacherBadgeText,
};

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
  // Step 1: the moderation team's rows (decisions, report outcomes, appeals and mail replies) have
  // their own words and no people.
  const teamText = teamTextFor[notification.kind];
  if (teamText !== undefined) return teamText(t, notification);
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
  }
  // Step 4: what is left is a new follower (the team's kinds were answered in step 1).
  return followerText(t, notification, ownHandle, base);
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
