/**
 * SpaceRow: one space in a list: its logo, name (a link), description, "214 members · run by
 * inkwolf" and its facts (bundle FORUMS-2, part a; S1-E8-06; board 5.1's Spaces card).
 * Who shows it: SpacesCard on the forum index (the /spaces page shows SpaceCard since G8b).
 * What it calls: SpaceLogo (nothing for a space without a logo, as the boards draw it; G8b),
 * SpaceFacts, and MetaLine for the compact row.
 * Since CALM-7c (board simplified/New-Together) the compact row is a hairline row with no side
 * padding: the logo, the name and "214 members · run by inkwolf · Members-only posting".
 */
import { Link } from 'react-router';

import { MetaLine } from '@/components/ui/MetaLine';
import { nameOf } from '@/features/forums/lib/forumPeople';
import { cn } from '@/lib/utils';

import type { Space } from '../api/spaces';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { SpaceLogo } from './SpaceLogo';
import { SpaceFacts } from './SpaceFacts';

/** What a row needs. */
interface SpaceRowProps {
  space: Space;
  /** True in the forum index's narrow card: no description and fewer facts. */
  isCompact?: boolean;
}

/**
 * Renders the row.
 *
 * @returns a list item
 */
export function SpaceRow({ space, isCompact = false }: SpaceRowProps) {
  const { t } = useSpacesTranslation();
  const owner = nameOf(space.owner, t('row.ownerDeleted'));
  return (
    <li
      className={cn(
        'flex items-start gap-3',
        isCompact
          ? 'border-t border-hairline py-3 first:border-t-0'
          : 'border-b border-border px-5 py-4 last:border-b-0 md:px-6',
      )}
    >
      <SpaceLogo space={space} size="small" />
      <div className="flex min-w-0 flex-col gap-1.5">
        <Link
          to={`/spaces/${space.slug}`}
          className="inline-flex min-h-6 items-center font-semibold break-words text-heading underline-offset-2 hover:underline"
        >
          {space.name}
        </Link>
        {!isCompact && space.description !== '' && (
          <p className="m-0 text-sm break-words text-body">{space.description}</p>
        )}
        {isCompact ? (
          <MetaLine
            facts={[
              { text: t('row.members', { count: space.memberCount, owner }) },
              { text: t(space.posting === 'members' ? 'pills.membersOnly' : 'pills.anyonePosts') },
            ]}
          />
        ) : (
          // CALM-9b (board F06): the members and the space's facts in one meta line.
          <SpaceFacts
            space={space}
            before={[{ text: t('row.members', { count: space.memberCount, owner }) }]}
          />
        )}
      </div>
    </li>
  );
}
