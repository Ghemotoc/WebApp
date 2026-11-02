/**
 * ClassWaitingCard: "Waiting to join" in a class space's settings (bundle CLASSES, part b; story
 * S1-E8-11: a student whose account isn't fully active yet joins but can't read or post until it
 * is; board ClassSpace, Teacher tools).
 *
 * What it shows: each member who joined but can't read yet, by handle and display name, with the
 * reason in plain words (age check not finished, waiting for a parent or guardian, account not
 * ready). Never an age, a year of birth or an email: staff and teachers see the reason only.
 * Who shows it: SpaceSettingsPage, for a class space, to whoever may manage its members (the
 * class's invite power). The database checks again.
 * What it calls: useClassWaitingMembers → class_waiting_members().
 */
import { Notice } from '@/components/ui/Notice';

import type { Space } from '../api/spaces';
import { useClassWaitingMembers } from '../hooks/useClassTools';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { SpaceFormCard } from './SpaceFormCard';

/**
 * The list, or a note while it loads, fails or is empty.
 *
 * @param props.slug - the space's address
 * @returns the list or the note
 */
function WaitingList({ slug }: { slug: string }) {
  const { t } = useSpacesTranslation();
  const waiting = useClassWaitingMembers(slug);
  if (waiting.isError) return <Notice tone="error">{t('classWaiting.loadFailed')}</Notice>;
  if (waiting.data === undefined) return null;
  if (waiting.data.length === 0) return <p className="m-0 text-body">{t('classWaiting.empty')}</p>;
  return (
    <ul className="m-0 list-none divide-y divide-border p-0">
      {waiting.data.map((member) => (
        <li
          key={member.handle}
          className="flex flex-wrap items-baseline justify-between gap-2 py-3"
        >
          <span className="font-semibold text-heading">
            {member.displayName} <span className="font-normal text-body">@{member.handle}</span>
          </span>
          <span className="text-sm text-body">{t(`classWaiting.reasons.${member.reason}`)}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Renders the card.
 *
 * @param props.space - the class space
 * @returns the card
 */
export function ClassWaitingCard({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  return (
    <SpaceFormCard
      eyebrow={t('classInvite.eyebrow')}
      title={t('classWaiting.title')}
      headingLevel="h2"
      headingId="class-waiting-heading"
    >
      <div className="flex flex-col gap-3">
        <p className="m-0 text-body">{t('classWaiting.intro')}</p>
        <WaitingList slug={space.slug} />
      </div>
    </SpaceFormCard>
  );
}
