/**
 * HubHomeCommentInvitations: a reader's own invitation to have one of their comments shown on
 * the home page, at the top of their Writers' hub (bundle GAPS-13; story S1-E5-13).
 *
 * Shows the comment and where it was left, with "Agree" and "Decline". Nothing shows to anyone
 * until the reader agrees, and they can take the comment down again at any time (GDPR
 * art. 7(3): as easy to withdraw as to give). Almost nobody has an invitation, so the block
 * usually stays away. The notification's link ends in #home-comment-invitation, this section.
 * Who shows it: WritersHubPage. What it calls: useHomeCommentInvitations (the website feature,
 * which owns the home page comment).
 */
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import type { HomeCommentInvitation } from '@/features/website/api/homeComment';
import { HomeCommentWords } from '@/features/website/components/HomeCommentWords';
import { useHomeCommentInvitations } from '@/features/website/hooks/useHomeComment';

import { useHubTranslation } from '../registerHubTranslations';

/** What one invitation needs. */
interface InvitationCardProps {
  invitation: HomeCommentInvitation;
  isBusy: boolean;
  onAnswer: (agrees: boolean) => void;
}

/**
 * The buttons for the invitation's state: both while waiting, the opposite one afterwards.
 *
 * @returns the buttons
 */
function AnswerButtons({ invitation, isBusy, onAnswer }: InvitationCardProps) {
  const { t } = useHubTranslation();
  if (invitation.answer === 'agreed') {
    return (
      <Button variant="secondary" disabled={isBusy} onClick={() => onAnswer(false)}>
        {t('hub.homeComment.withdraw')}
      </Button>
    );
  }
  if (invitation.answer === 'declined') {
    return (
      <Button variant="secondary" disabled={isBusy} onClick={() => onAnswer(true)}>
        {t('hub.invitation.agreeAfterAll')}
      </Button>
    );
  }
  return (
    <>
      <Button disabled={isBusy} onClick={() => onAnswer(true)}>
        {t('hub.invitation.agree')}
      </Button>
      <Button variant="secondary" disabled={isBusy} onClick={() => onAnswer(false)}>
        {t('hub.invitation.decline')}
      </Button>
    </>
  );
}

/**
 * One invitation: what would show, the comment, where things stand and the buttons.
 *
 * @returns the card
 */
function InvitationCard({ invitation, isBusy, onAnswer }: InvitationCardProps) {
  const { t } = useHubTranslation();
  return (
    <li className="flex flex-col gap-3 rounded-card border border-border bg-surface p-6 shadow-card md:p-8">
      <h3 className="m-0 font-heading text-[22px] leading-tight font-bold text-heading">
        {t('hub.homeComment.heading')}
      </h3>
      <p className="m-0 text-body">{t('hub.homeComment.body')}</p>
      <HomeCommentWords
        text={invitation.body}
        className="m-0 border-l-2 border-border pl-4 text-body wrap-anywhere"
      />
      <p className="m-0 text-sm wrap-anywhere text-meta">
        {t('hub.homeComment.place', {
          story: invitation.storyTitle,
          position: invitation.chapterPosition,
        })}
      </p>
      <p className="m-0 text-sm text-meta" aria-live="polite">
        {t(`hub.homeComment.status.${invitation.answer}`)}
      </p>
      <div className="flex flex-wrap gap-3">
        <AnswerButtons invitation={invitation} isBusy={isBusy} onAnswer={onAnswer} />
      </div>
    </li>
  );
}

/**
 * Renders the invitations.
 *
 * @returns the list under its heading, or nothing without an invitation
 */
export function HubHomeCommentInvitations() {
  const { t } = useHubTranslation();
  const { invitations, answer, isAnswering, answerFailed } = useHomeCommentInvitations();
  if (invitations.length === 0) return null;
  return (
    <section
      id="home-comment-invitation"
      aria-labelledby="home-comment-invitation-heading"
      className="flex scroll-mt-28 flex-col gap-4"
    >
      <h2 id="home-comment-invitation-heading" className="eyebrow m-0">
        {t('hub.invitation.eyebrow')}
      </h2>
      {answerFailed && <Notice tone="error">{t('hub.invitation.failed')}</Notice>}
      <ul className="m-0 flex list-none flex-col gap-4 p-0">
        {invitations.map((invitation) => (
          <InvitationCard
            key={invitation.id}
            invitation={invitation}
            isBusy={isAnswering}
            onAnswer={(agrees) => answer(invitation.id, agrees)}
          />
        ))}
      </ul>
    </section>
  );
}
