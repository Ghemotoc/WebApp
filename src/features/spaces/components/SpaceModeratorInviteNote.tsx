/**
 * SpaceModeratorInviteNote: "Help run Fantasy writers' circle?" on a space's page, for a member
 * the owner invited to moderate: the powers offered, "Accept" and "Decline" (bundle BOOKS-7, user
 * stories 7.7 and 7.10: "they accept first"). The member also gets a notification that brings
 * them here (notification_kind 'space_moderator_invited').
 *
 * The answer is said in a polite live region, and the note goes once the space reads again.
 * Who shows it: SpacePage. What it calls: useAnswerModeratorInvite →
 * answer_space_moderator_invite().
 */
import { Button } from '@/components/ui/Button';
import { ButtonRow } from '@/components/ui/ButtonRow';
import { Notice } from '@/components/ui/Notice';
import { errorShownByHook } from '@/lib/errorShownByHook';

import type { Space } from '../api/spaces';
import { useAnswerModeratorInvite } from '../hooks/useSpaceBlocks';
import { spaceFailureText } from '../lib/spaceFailures';
import { powerKeys } from '../lib/spacePowers';
import { useSpacesTranslation } from '../registerSpacesTranslations';

/**
 * Renders the note.
 *
 * @param props.space - the space
 * @returns the note, the answer just given, or nothing when no invitation waits
 */
export function SpaceModeratorInviteNote({ space }: { space: Space }) {
  const { t, i18n } = useSpacesTranslation();
  const answering = useAnswerModeratorInvite(space.slug);
  const invitedPowers = space.viewer.moderatorInvite;
  const answerLine = (
    <p aria-live="polite" className="m-0 type-body text-ink-muted empty:hidden">
      {answering.answer === null ? '' : t(`invite.${answering.answer}`)}
    </p>
  );
  if (invitedPowers === null) return answerLine;
  const listFormat = new Intl.ListFormat(i18n.language, { type: 'conjunction' });
  const powers = listFormat.format(powerKeys(invitedPowers).map((key) => t(key)));
  return (
    <section
      aria-labelledby="space-moderator-invite-heading"
      className="flex flex-col gap-3 rounded-card border border-border bg-surface px-6 py-4"
    >
      <h2
        id="space-moderator-invite-heading"
        className="m-0 font-heading type-subheading font-bold text-ink-heading"
      >
        {t('invite.title', { name: space.name })}
      </h2>
      <p className="m-0 type-body text-ink-muted">{t('invite.body', { powers })}</p>
      <ButtonRow>
        <Button
          disabled={answering.isRunning}
          onClick={() => void answering.run(true).catch(errorShownByHook)}
        >
          {t('invite.accept')}
        </Button>
        <Button
          variant="secondary"
          disabled={answering.isRunning}
          onClick={() => void answering.run(false).catch(errorShownByHook)}
        >
          {t('invite.decline')}
        </Button>
      </ButtonRow>
      {answerLine}
      {answering.failure !== null && (
        <Notice tone="error">{t(...spaceFailureText(answering.failure))}</Notice>
      )}
    </section>
  );
}
