/**
 * WriterResultRow: one writer a search found, as a row on phones (bundle CALM-7c; board
 * simplified/New-PhoneSearch): the avatar, the name as a link to the profile, a meta line with the
 * username and how many stories, and a quiet Follow.
 *
 * Never shows a user ID (architecture 1.6): the profile address and Follow go by username. Follow
 * is the shared FollowButton, so signed-out readers, read-only accounts and blocks behave as on a
 * profile.
 * Who uses it: SearchGroupRows. What it calls: PersonAvatar and FollowButton.
 */
import { Link } from 'react-router';

import { MetaLine } from '@/components/ui/MetaLine';
import { PersonAvatar } from '@/features/avatars/components/PersonAvatar';
import { FollowButton } from '@/features/people/components/FollowButton';

import type { FoundWriter } from '../api/search';
import { useSearchTranslation } from '../registerSearchTranslations';

/**
 * Renders the row.
 *
 * @param props.writer - the writer
 * @returns one list item
 */
export function WriterResultRow({ writer }: { writer: FoundWriter }) {
  const { t } = useSearchTranslation();
  return (
    <li className="flex items-center gap-3 border-t border-hairline py-3 first:border-t-0">
      <PersonAvatar name={writer.displayName} handle={writer.handle} size="medium" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Link
          to={`/u/${encodeURIComponent(writer.handle)}`}
          className="text-[15px] leading-5 font-semibold break-words text-heading no-underline hover:underline"
        >
          {writer.displayName}
        </Link>
        <MetaLine
          facts={[
            { text: t('results.writerHandle', { handle: writer.handle }) },
            { text: t('results.stories', { count: writer.storyCount }) },
          ]}
        />
      </span>
      <FollowButton
        target={{ kind: 'writer', handle: writer.handle }}
        targetLabel={writer.displayName}
      />
    </li>
  );
}
