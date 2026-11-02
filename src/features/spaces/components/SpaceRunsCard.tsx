/**
 * SpaceRunsCard: "Who runs it": the owner, and that our moderation team can act in any space
 * (bundle FORUMS-2, part a; S1-E8-06; the board's side card). Space moderators join the list in
 * part b (S1-E8-07).
 * Who shows it: SpacePage. What it calls: nothing; the owner comes with the space.
 */
import { Link } from 'react-router';

import { nameOf } from '@/features/forums/lib/forumPeople';

import type { Space } from '../api/spaces';
import { useSpacesTranslation } from '../registerSpacesTranslations';

/**
 * Renders the card.
 *
 * @param props.space - the space
 * @returns the section with the owner and the note
 */
export function SpaceRunsCard({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  const owner = space.owner;
  return (
    <section
      aria-labelledby="space-runs-heading"
      className="flex flex-col gap-3 rounded-card border border-border bg-surface px-6 py-5"
    >
      <h2 id="space-runs-heading" className="m-0 font-heading text-xl font-bold text-heading">
        {t('runs.title')}
      </h2>
      <p className="m-0 flex flex-col text-sm">
        {owner === null ? (
          <span className="font-semibold text-heading">{nameOf(owner, t('row.ownerDeleted'))}</span>
        ) : (
          <Link
            to={`/u/${owner.handle}`}
            className="inline-flex min-h-6 items-center font-semibold text-link underline"
          >
            {owner.displayName}
          </Link>
        )}
        <span className="text-meta">{t('runs.owner')}</span>
      </p>
      <p className="m-0 text-[13px] text-body">{t('runs.note')}</p>
    </section>
  );
}
