/**
 * RisingWritersList: "New and rising writers" in the Read page's side column (story S1-E5-11;
 * since CALM-7c the simplified board New-Read).
 *
 * Board values: the heading, then one row per writer split by the hairline: the avatar, the name
 * as a link to the profile, "Writes romance" (the writer's main category) and a quiet Follow. It
 * shows the first five writers rising_writers() suggests, with the same rules as the shelf (only
 * writers who agreed to be suggested, never across a block). For a member it takes the shelf's
 * place on the Read page, so the same writers aren't shown twice; visitors still get the shelf.
 * Who shows it: ReadSideColumn. What it calls: useRisingWriters → rising_writers(), PersonAvatar
 * and FollowButton (follow_writer()).
 */
import { Link } from 'react-router';

import { PersonAvatar } from '@/features/avatars/components/PersonAvatar';
import { FollowButton } from '@/features/people/components/FollowButton';

import type { RisingWriter } from '../api/risingWriters';
import { useRisingWriters } from '../hooks/useRisingWriters';
import { useDiscoveryTranslation } from '../registerDiscoveryTranslations';

/** How many writers the side column lists (the board shows three; five keeps the shelf's spread). */
const writersShown = 5;

/**
 * One writer's row.
 *
 * @param props.writer - the writer, from rising_writers()
 * @returns the list item
 */
function WriterRow({ writer }: { writer: RisingWriter }) {
  const { t, i18n } = useDiscoveryTranslation();
  return (
    <li className="flex items-center gap-3 border-t border-(--hairline) py-3">
      <PersonAvatar name={writer.displayName} handle={writer.handle} size="medium" />
      <span className="flex min-w-0 flex-1 flex-col">
        <Link
          to={`/u/${encodeURIComponent(writer.handle)}`}
          className="font-semibold break-words text-ink no-underline hover:underline"
        >
          {writer.displayName}
        </Link>
        {writer.categorySlug !== null && (
          <span className="type-meta">
            {t('risingWriters.writes', {
              category: t(`categories.${writer.categorySlug}`, { ns: 'writing' }).toLocaleLowerCase(
                i18n.language,
              ),
            })}
          </span>
        )}
      </span>
      <FollowButton
        target={{ kind: 'writer', handle: writer.handle }}
        targetLabel={writer.displayName}
      />
    </li>
  );
}

/**
 * Renders the section, or nothing when no writer is suggested.
 *
 * @returns the section or null
 */
export function RisingWritersList() {
  const { t } = useDiscoveryTranslation();
  const { writers } = useRisingWriters();
  if (writers.length === 0) return null;
  return (
    <section aria-labelledby="read-writers-heading" className="flex flex-col">
      <h2 id="read-writers-heading" className="m-0 mb-1 type-subheading">
        {t('risingWriters.title')}
      </h2>
      <ul className="m-0 list-none p-0">
        {writers.slice(0, writersShown).map((writer) => (
          <WriterRow key={writer.handle} writer={writer} />
        ))}
      </ul>
    </section>
  );
}
