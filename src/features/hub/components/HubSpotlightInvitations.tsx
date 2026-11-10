/**
 * HubSpotlightInvitations: the picked writer's own invitation to be writer of the week, at the
 * top of their Writers' hub (bundle GAPS-12e).
 *
 * Says which days the card would show and the line staff wrote, with "Agree" and "Decline".
 * Nothing shows to anyone else until the writer agrees, and the answer can be changed until the
 * week ends (GDPR art. 7(3): as easy to withdraw as to give). Almost nobody has an invitation,
 * so the block usually stays away.
 * Who shows it: WritersHubPage. What it calls: useMySpotlights.
 */
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import type { SpotlightInvitation } from '../api/hubSpotlight';
import { useMySpotlights } from '../hooks/useHubSpotlight';
import { useHubTranslation } from '../registerHubTranslations';

import { formatStaffDay } from './staff/formatStaffDay';

/** What one invitation needs. */
interface InvitationCardProps {
  invitation: SpotlightInvitation;
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
        {t('hub.invitation.withdraw')}
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
 * One invitation: the days, staff's line, where things stand and the buttons.
 *
 * @returns the card
 */
function InvitationCard({ invitation, isBusy, onAnswer }: InvitationCardProps) {
  const { t, i18n } = useHubTranslation();
  // The days and the line, written the reader's way.
  const days = {
    from: formatStaffDay(invitation.startsOn, i18n.language),
    to: formatStaffDay(invitation.endsOn, i18n.language),
  };
  const reason = i18n.language === 'ro' ? invitation.reasonRo : invitation.reasonEn;
  return (
    <li className="flex flex-col gap-3 rounded-card border border-border bg-surface p-6 shadow-card md:p-8">
      <h3 className="m-0 font-heading text-[22px] leading-tight font-bold text-heading">
        {t('hub.invitation.heading')}
      </h3>
      <p className="m-0 text-body">{t('hub.invitation.body', days)}</p>
      <blockquote className="m-0 border-l-2 border-border pl-4 text-body wrap-anywhere">
        {reason}
      </blockquote>
      <p className="m-0 text-sm text-meta" aria-live="polite">
        {t(`hub.invitation.status.${invitation.answer}`)}
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
export function HubSpotlightInvitations() {
  const { t } = useHubTranslation();
  const { invitations, answer, isAnswering, answerFailed } = useMySpotlights();
  if (invitations.length === 0) return null;
  return (
    <section aria-labelledby="hub-invitations" className="flex flex-col gap-4">
      <h2 id="hub-invitations" className="eyebrow m-0">
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
