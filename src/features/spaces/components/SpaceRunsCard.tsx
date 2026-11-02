/**
 * SpaceRunsCard: "Who runs it": the owner, the moderators with their powers, and that our
 * moderation team can act in any space (bundle FORUMS-2, parts a and b; S1-E8-06 and S1-E8-07;
 * the board's side card).
 * Who shows it: SpacePage. What it calls: useSpaceModerators → space_moderators(); the owner comes
 * with the space.
 */
import { Link } from 'react-router';

import type { ForumPerson } from '@/features/forums/api/forumThreads';
import { nameOf } from '@/features/forums/lib/forumPeople';

import type { Space } from '../api/spaces';
import { useSpaceModerators } from '../hooks/useSpaceModeration';
import { powerKeys } from '../lib/spacePowers';
import { useSpacesTranslation } from '../registerSpacesTranslations';

/**
 * One person: their name (a link to their profile) and what they do in the space.
 *
 * @param props.person - the person, or null for a deleted account
 * @param props.role - the line under the name ("Owner", "Moderator: posts and members")
 * @returns a list item
 */
function RunsPerson({ person, role }: { person: ForumPerson; role: string }) {
  const { t } = useSpacesTranslation();
  return (
    <li className="flex flex-col border-b border-border py-2 text-sm last:border-b-0">
      {person === null ? (
        <span className="font-semibold text-heading">{nameOf(person, t('row.ownerDeleted'))}</span>
      ) : (
        <Link
          to={`/u/${person.handle}`}
          className="inline-flex min-h-6 items-center font-semibold break-words text-link underline"
        >
          {person.displayName}
        </Link>
      )}
      <span className="text-meta">{role}</span>
    </li>
  );
}

/**
 * Renders the card.
 *
 * @param props.space - the space
 * @returns the section with the owner, the moderators and the note
 */
export function SpaceRunsCard({ space }: { space: Space }) {
  const { t, i18n } = useSpacesTranslation();
  const moderators = useSpaceModerators(space.slug);
  const listFormat = new Intl.ListFormat(i18n.language, { type: 'conjunction' });
  return (
    <section
      aria-labelledby="space-runs-heading"
      className="flex flex-col gap-3 rounded-card border border-border bg-surface px-6 py-5"
    >
      <h2 id="space-runs-heading" className="m-0 font-heading text-xl font-bold text-heading">
        {t('runs.title')}
      </h2>
      <ul className="m-0 list-none p-0">
        <RunsPerson person={space.owner} role={t('runs.owner')} />
        {(moderators.data ?? []).map((moderator) => (
          <RunsPerson
            key={moderator.person?.handle ?? 'deleted'}
            person={moderator.person}
            role={t('runs.moderator', {
              powers: listFormat.format(powerKeys(moderator.powers).map((key) => t(key))),
            })}
          />
        ))}
      </ul>
      <p className="m-0 text-[13px] text-body">{t('runs.note')}</p>
    </section>
  );
}
