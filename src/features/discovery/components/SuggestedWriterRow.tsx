/**
 * SuggestedWriterRow: one writer in a list of suggested writers (story S1-E5-11; moved out of
 * RisingWritersList for the Read page's two lists, user story 1.4, board A04).
 *
 * Board values: the avatar, the name as a link to the profile, "Writes romance" (the writer's main
 * category) and a quiet Follow, with a hairline above the row.
 * Two tones:
 * - plain: on the page's own background or the box surface (Read, Search, the visitors' home);
 * - band: inside the dark writers' band on a member's home page (board A01, 23 Nov 2026): names in
 *   the band's text colour, meta at 72 %, row lines at 14 % (the `band-writers` rules in
 *   src/styles/index.css). At night the band's text colour is the page's ink (NIGHT-2).
 * Who shows it: RisingWritersList and ReadWritersBox. What it calls: PersonAvatar and
 * FollowButton (follow_writer()).
 */
import { Link } from 'react-router';

import { PersonAvatar } from '@/features/avatars/components/PersonAvatar';
import { FollowButton } from '@/features/people/components/FollowButton';
import { cn } from '@/lib/utils';

import type { RisingWriter } from '../api/risingWriters';
import { writerToneClasses, type RisingWritersTone } from '../lib/writerTone';
import { useDiscoveryTranslation } from '../registerDiscoveryTranslations';

/**
 * One writer's row.
 *
 * @param props.writer - the writer, from rising_writers() or writers_to_follow_now()
 * @param props.tone - plain (the default) or band
 * @returns the list item
 */
export function SuggestedWriterRow({
  writer,
  tone = 'plain',
}: {
  writer: RisingWriter;
  tone?: RisingWritersTone;
}) {
  const { t, i18n } = useDiscoveryTranslation();
  const classes = writerToneClasses[tone];
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
        {/* The main category, in lower case inside the sentence ("Writes romance"). */}
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
