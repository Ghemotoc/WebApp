/**
 * SpaceLogLine: one row of a space's moderation log: when, who and what happened, with the
 * thread and the reason where there is one (bundle FORUMS-2, part b; S1-E8-07 criterion 2; drawn
 * as a table row in bundle BOOKS-7, board F12).
 *
 * Our moderation team shows as "The moderation team", never by name; a deleted account as "a
 * deleted account". A thread that is still there is a link to it.
 * Who shows it: SpaceLogTable.
 */
import { Link } from 'react-router';

import { postTime } from '@/features/forums/lib/forumDates';
import { nameOf } from '@/features/forums/lib/forumPeople';

import type { SpaceLogEntry } from '../api/spaceModeration';
import type { Space } from '../api/spaces';
import { powerKeys } from '../lib/spacePowers';
import { logActionKey } from '../lib/spaceLogText';
import { useSpacesTranslation } from '../registerSpacesTranslations';

/** The cell style the board draws: 12 px around, a hairline under each row. */
const cell = 'border-b border-border p-3 text-left align-top';

/**
 * Who acted, in words.
 *
 * @param entry - the log line
 * @returns their name, "The moderation team" or "a deleted account"
 */
function useActorName(entry: SpaceLogEntry): string {
  const { t } = useSpacesTranslation();
  if (entry.actor === null && entry.action !== '') return t('log.team');
  return nameOf(entry.actor, t('row.ownerDeleted'));
}

/**
 * Renders the row.
 *
 * @param props.entry - the log line
 * @param props.space - the space, for the thread link
 * @returns a table row
 */
export function SpaceLogLine({ entry, space }: { entry: SpaceLogEntry; space: Space }) {
  const { t, i18n } = useSpacesTranslation();
  const listFormat = new Intl.ListFormat(i18n.language, { type: 'conjunction' });
  const actor = useActorName(entry);
  // The sentence names the person acted on and the powers given, in the reader's language.
  const text = t(logActionKey(entry.action), {
    actor,
    target: nameOf(entry.target, t('row.ownerDeleted')),
    powers: listFormat.format(powerKeys(entry.powersAfter).map((key) => t(key))),
  });
  return (
    <tr>
      <th
        scope="row"
        className={`${cell} type-label font-semibold whitespace-nowrap text-ink-heading`}
      >
        {postTime(entry.createdAt, i18n.language)}
      </th>
      <td className={`${cell} type-body break-words text-ink`}>{actor}</td>
      <td className={`${cell} type-body break-words text-ink`}>
        <span className="flex flex-col gap-1">
          <span>{text}</span>
          {entry.thread !== null && (
            <Link
              to={`/forums/${space.forumSlug}/${entry.thread.number}`}
              className="inline-flex min-h-6 items-center break-words text-link underline"
            >
              {entry.thread.title}
            </Link>
          )}
          {entry.note !== null && (
            <span className="text-ink-muted">{t('log.reason', { reason: entry.note })}</span>
          )}
        </span>
      </td>
    </tr>
  );
}
