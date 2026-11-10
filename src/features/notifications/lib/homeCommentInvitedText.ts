/**
 * What the "we'd like to show your comment on the home page" notification says (bundle GAPS-13;
 * story S1-E5-13; board Website-Home, the reader comment card).
 *
 * A reader gets this one row when staff pick one of their comments. It comes from the team, not
 * from a person, and leads to the invitation on the reader's own hub, where they agree or
 * decline; nothing shows on the home page until they agree.
 * Who calls it: notificationText.ts, through its table of kinds with words of their own.
 */
import type { TFunction } from 'i18next';

import type { NotificationText } from './notificationText';

/**
 * The words of a home_comment_invited row.
 *
 * @param t - the notifications translation function
 * @returns the row's words and the link to the invitation
 */
export function homeCommentInvitedText(t: TFunction): NotificationText {
  return {
    who: t('who.ourTeam'),
    what: t('what.homeCommentInvited'),
    quote: null,
    grouped: null,
    actionLabel: t('actions.seeHomeCommentInvitation'),
    href: '/hub#home-comment-invitation',
  };
}
