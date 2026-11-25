/**
 * RisingWritersList: "New and rising writers" as a list of rows (story S1-E5-11; since CALM-7c
 * the simplified board New-Read, and since CALM-9 the home page's bands, canvas comments of
 * 23 Nov 2026).
 *
 * Board values: the heading, then one row per writer split by the hairline: the avatar, the name
 * as a link to the profile, "Writes romance" (the writer's main category) and a quiet Follow. It
 * shows the first five writers rising_writers() suggests, with the same rules as the shelf (only
 * writers who agreed to be suggested, never across a block).
 * Two tones:
 * - plain: the Read page's writers' box and the home page's card for visitors (board A02);
 * - band: inside the dark writers' band on a member's home page (board A01, 23 Nov 2026): the
 *   heading "Draw inspiration from new and rising writers" in the display font at 20/28, names in
 *   the band's text colour, meta at 72 %, row lines at 14 % and a clear Follow with a 42 % edge
 *   (the `band-writers` rules in src/styles/index.css). At night the band's text colour is the
 *   page's ink, so the same classes read on the night box too (NIGHT-2).
 * Who shows it: ReadWritersBox, WriteBand (members) and FirstStoryBand (visitors). What it calls:
 * useRisingWriters → rising_writers(), PersonAvatar and FollowButton (follow_writer()).
 */
import { Link } from 'react-router';

import { PersonAvatar } from '@/features/avatars/components/PersonAvatar';
import { FollowButton } from '@/features/people/components/FollowButton';
import { cn } from '@/lib/utils';

import type { RisingWriter } from '../api/risingWriters';
import { useRisingWriters } from '../hooks/useRisingWriters';
import { useDiscoveryTranslation } from '../registerDiscoveryTranslations';

/** How many writers the list shows (the board shows three; five keeps the shelf's spread). */
const writersShown = 5;

/** Where the list sits: on the page's own background, or inside the dark writers' band. */
export type RisingWritersTone = 'plain' | 'band';

/** The classes that change with the tone, so the rows below stay free of conditions. */
const toneClasses: Record<
  RisingWritersTone,
  { heading: string; row: string; name: string; meta: string }
> = {
  plain: {
    heading: 'type-subheading',
    row: 'border-(--hairline)',
    name: 'text-ink',
    meta: 'type-meta',
  },
  band: {
    // Display font, 20/28, in the band's text colour (board A01, 23 Nov 2026).
    heading: 'font-heading type-subheading leading-7 font-bold text-on-primary',
    row: 'border-on-primary/14',
    name: 'text-on-primary',
    meta: 'type-meta leading-[18px] text-on-primary/72',
  },
};

/**
 * One writer's row.
 *
 * @param props.writer - the writer, from rising_writers()
 * @param props.tone - plain or band
 * @returns the list item
 */
function WriterRow({ writer, tone }: { writer: RisingWriter; tone: RisingWritersTone }) {
  const { t, i18n } = useDiscoveryTranslation();
  const classes = toneClasses[tone];
  return (
    <li className={cn('flex items-center gap-3 border-t py-3', classes.row)}>
      <PersonAvatar name={writer.displayName} handle={writer.handle} size="medium" />
      <span className="flex min-w-0 flex-1 flex-col">
        <Link
          to={`/u/${encodeURIComponent(writer.handle)}`}
          className={cn('font-semibold break-words no-underline hover:underline', classes.name)}
        >
          {writer.displayName}
        </Link>
        {writer.categorySlug !== null && (
          <span className={classes.meta}>
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

/** What the list needs. */
export interface RisingWritersListProps {
  /** Plain (the default) or inside the dark writers' band. */
  tone?: RisingWritersTone;
  /** The heading's id, unique on the page. */
  headingId?: string;
}

/**
 * Renders the section, or nothing when no writer is suggested.
 *
 * @param props.tone - plain or band
 * @param props.headingId - the heading's id
 * @returns the section or null
 */
export function RisingWritersList({
  tone = 'plain',
  headingId = 'read-writers-heading',
}: RisingWritersListProps) {
  const { t } = useDiscoveryTranslation();
  const { writers } = useRisingWriters();
  // Step 1: nobody to suggest, so no empty heading.
  if (writers.length === 0) return null;
  // Step 2: the band has its own, longer heading (board A01, 23 Nov 2026).
  const titleKey = tone === 'band' ? 'risingWriters.bandTitle' : 'risingWriters.title';
  return (
    <section aria-labelledby={headingId} data-writers-tone={tone} className="flex flex-col">
      <h2 id={headingId} className={cn('m-0 mb-1', toneClasses[tone].heading)}>
        {t(titleKey)}
      </h2>
      <ul className="m-0 list-none p-0">
        {writers.slice(0, writersShown).map((writer) => (
          <WriterRow key={writer.handle} writer={writer} tone={tone} />
        ))}
      </ul>
    </section>
  );
}
