/**
 * SpaceHandoverOffer: "Ana offered you this space" at the top of a space, with Accept and Decline
 * (bundle 14d IDEAS-3, part e; idea IDEA-20261102-7, criterion 1).
 *
 * Only the moderator the owner offered the space to sees it (viewer.handover.isForMe). Accepting
 * makes them the owner and the old owner a moderator with every power; nobody is handed a duty
 * they didn't want. Both answers are in the space's log (criterion 2).
 * Who shows it: SpacePage, above the welcome note. What it calls: useAnswerHandover →
 * answer_space_handover().
 */
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { nameOf } from '@/features/forums/lib/forumPeople';

import type { Space } from '../api/spaces';
import { useAnswerHandover } from '../hooks/useSpaceHandover';
import { spaceFailureText } from '../lib/spaceFailures';
import { useSpacesTranslation } from '../registerSpacesTranslations';

/**
 * Renders the offer.
 *
 * @param props.space - the space
 * @returns the offer with its two buttons, or nothing when there is none for the reader
 */
export function SpaceHandoverOffer({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  const answering = useAnswerHandover(space.slug);
  const handover = space.viewer.handover;
  if (handover === null || !handover.isForMe) return null;
  const name = nameOf(handover.from, t('row.ownerDeleted'));
  return (
    <section
      aria-labelledby="space-handover-offer-heading"
      className="flex flex-col gap-3 rounded-card border border-border bg-surface px-6 py-5"
    >
      <h2
        id="space-handover-offer-heading"
        className="m-0 font-heading text-xl font-bold text-heading"
      >
        {t('handover.offerTitle', { name, space: space.name })}
      </h2>
      <p className="m-0 text-[15px] text-body">{t('handover.offerText', { name })}</p>
      <div className="flex flex-wrap gap-3">
        <Button
          disabled={answering.isRunning}
          onClick={() => void answering.run(true).catch(() => undefined)}
        >
          {t('handover.accept')}
        </Button>
        <Button
          variant="secondary"
          disabled={answering.isRunning}
          onClick={() => void answering.run(false).catch(() => undefined)}
        >
          {t('handover.decline')}
        </Button>
      </div>
      {answering.failure !== null && (
        <Notice tone="error">{t(...spaceFailureText(answering.failure))}</Notice>
      )}
    </section>
  );
}
