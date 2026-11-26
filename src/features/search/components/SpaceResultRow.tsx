/**
 * SpaceResultRow: one space a search found, as a row under a hairline like the writers' rows
 * (user story 1.8, board A08-SearchResults, the Spaces tab): the space's tile (its logo once
 * checked, or its banner colour), the name as a link to the space, a meta line with the members
 * and who can post, and the start of the description.
 *
 * Never shows a user ID: the space goes by its address (architecture 1.6).
 * Who uses it: SearchSpacesTab. What it calls: SpaceTile and MetaLine.
 */
import { Link } from 'react-router';

import { MetaLine } from '@/components/ui/MetaLine';
import type { Space } from '@/features/spaces/api/spaces';
import { SpaceTile } from '@/features/spaces/components/SpaceTile';
import { useSpacesTranslation } from '@/features/spaces/registerSpacesTranslations';

/**
 * The facts under a space's name: members, then who can post (a class says it is private).
 *
 * @param space - the space
 * @param t - the spaces translation
 * @returns the facts in reading order
 */
function spaceFacts(space: Space, t: ReturnType<typeof useSpacesTranslation>['t']) {
  const members = { text: t('space.members', { count: space.memberCount }) };
  // A class only shows to its members, so it says it is private instead of the posting rule.
  if (space.kind === 'class') return [members, { text: t('cover.private') }];
  const posting = t(space.posting === 'members' ? 'card.postingMembers' : 'card.postingAnyone');
  return [members, { text: posting }];
}

/**
 * Renders the row.
 *
 * @param props.space - the space
 * @returns one list item
 */
export function SpaceResultRow({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  return (
    <li className="flex items-start gap-3 border-t border-hairline py-3 first:border-t-0">
      <SpaceTile space={space} />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <Link
          to={`/spaces/${encodeURIComponent(space.slug)}`}
          className="type-body leading-5 font-semibold break-words text-ink-heading no-underline hover:underline"
        >
          {space.name}
        </Link>
        <MetaLine facts={spaceFacts(space, t)} />
        {space.description !== '' && (
          <span className="line-clamp-2 type-body break-words text-ink-muted">
            {space.description}
          </span>
        )}
      </span>
    </li>
  );
}
