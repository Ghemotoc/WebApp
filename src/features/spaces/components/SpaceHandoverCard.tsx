/**
 * SpaceHandoverCard: "Hand over this space" in Space settings (bundle 14d IDEAS-3, part e; idea
 * IDEA-20261102-7).
 *
 * The owner picks one of the space's moderators and offers them the space. Nothing changes until
 * they accept: then they become the owner and the old owner stays on as a moderator with every
 * power (criterion 1). While an offer is open, the card says to whom and when, with "Take back
 * the offer". The database checks again that the moderator is in the space's age group (and, for
 * a class, has a teacher badge) and says why not in plain words.
 * Who shows it: SpaceSettingsPage, for the owner only (viewer.canHandOver).
 * What it calls: useSpaceModerators → space_moderators(); useOfferHandover and useCancelHandover
 * → offer_space_handover() and cancel_space_handover().
 */
import { useId, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Select } from '@/components/ui/Select';
import { postTime } from '@/features/forums/lib/forumDates';
import { nameOf } from '@/features/forums/lib/forumPeople';

import type { Space, SpaceHandover } from '../api/spaces';
import { useCancelHandover, useOfferHandover } from '../hooks/useSpaceHandover';
import { useSpaceModerators } from '../hooks/useSpaceModeration';
import { spaceFailureText } from '../lib/spaceFailures';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { SpaceFormCard } from './SpaceFormCard';

/**
 * The open offer: to whom, since when, and "Take back the offer".
 *
 * @param props.slug - the space's address
 * @param props.handover - the open offer
 * @returns the note with its button
 */
function OpenOffer({ slug, handover }: { slug: string; handover: SpaceHandover }) {
  const { t, i18n } = useSpacesTranslation();
  const cancelling = useCancelHandover(slug);
  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-[15px] text-body">
        {t('handover.offered', {
          name: nameOf(handover.to, t('row.ownerDeleted')),
          time: postTime(handover.offeredAt, i18n.language),
        })}
      </p>
      <Button
        variant="secondary"
        className="self-start"
        disabled={cancelling.isRunning}
        onClick={() => void cancelling.run().catch(() => undefined)}
      >
        {t('handover.cancel')}
      </Button>
      {cancelling.failure !== null && (
        <Notice tone="error">{t(...spaceFailureText(cancelling.failure))}</Notice>
      )}
    </div>
  );
}

/**
 * The moderator to offer it to, and "Offer the space".
 *
 * @param props.slug - the space's address
 * @returns the picker, or a note when the space has no moderator yet
 */
function OfferForm({ slug }: { slug: string }) {
  const { t } = useSpacesTranslation();
  const fieldId = useId();
  const moderators = useSpaceModerators(slug);
  const offering = useOfferHandover(slug);
  const options = (moderators.data ?? []).flatMap((moderator) =>
    moderator.person === null
      ? []
      : [{ value: moderator.person.handle, label: moderator.person.displayName }],
  );
  const [chosen, setChosen] = useState('');
  const handle = chosen === '' ? (options[0]?.value ?? '') : chosen;
  if (moderators.isLoading) return null;
  if (options.length === 0)
    return <p className="m-0 text-[15px] text-body">{t('handover.none')}</p>;
  return (
    <div className="flex flex-col gap-4">
      <Select
        id={fieldId}
        label={t('handover.label')}
        isLabelVisible
        options={options}
        value={handle}
        onChange={setChosen}
      />
      <Button
        className="self-start"
        disabled={offering.isRunning || handle === ''}
        onClick={() => void offering.run(handle).catch(() => undefined)}
      >
        {t('handover.offer')}
      </Button>
      {offering.failure !== null && (
        <Notice tone="error">{t(...spaceFailureText(offering.failure))}</Notice>
      )}
    </div>
  );
}

/**
 * Renders the card.
 *
 * @param props.space - the space; its viewer.handover is the open offer
 * @returns the card
 */
export function SpaceHandoverCard({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  const handover = space.viewer.handover;
  return (
    <SpaceFormCard
      eyebrow={t('handover.eyebrow')}
      title={t('handover.title')}
      intro={t('handover.intro')}
      headingLevel="h2"
      headingId="space-handover-heading"
    >
      <div aria-live="polite">
        {handover === null ? (
          <OfferForm slug={space.slug} />
        ) : (
          <OpenOffer slug={space.slug} handover={handover} />
        )}
      </div>
    </SpaceFormCard>
  );
}
