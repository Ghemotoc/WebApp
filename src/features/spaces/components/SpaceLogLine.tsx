/**
 * SpaceLogLine: one line of a space's log: who did what, to whom or to which thread, when, and
 * the reason given (bundle FORUMS-2, part b; S1-E8-07 criterion 2).
 *
 * Our moderation team shows as "The moderation team", never by name; a deleted account as "a
 * deleted account". A thread that is still there is a link to it.
 * Who shows it: SpaceLogPage.
 */
import { Link } from 'react-router';

import { postTime } from '@/features/forums/lib/forumDates';
import { nameOf } from '@/features/forums/lib/forumPeople';

import type { SpaceLogEntry } from '../api/spaceModeration';
import type { Space } from '../api/spaces';
import { powerKeys } from '../lib/spacePowers';
import { logActionKey } from '../lib/spaceLogText';
import { useSpacesTranslation } from '../registerSpacesTranslations';

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
 * Renders the line.
 *
 * @param props.entry - the log line
 * @param props.space - the space, for the thread link
 * @returns a list item
 */
export function SpaceLogLine({ entry, space }: { entry: SpaceLogEntry; space: Space }) {
  const { t, i18n } = useSpacesTranslation();
  const listFormat = new Intl.ListFormat(i18n.language, { type: 'conjunction' });
  const actor = useActorName(entry);
  const text = t(logActionKey(entry.action), {
    actor,
    target: nameOf(entry.target, t('row.ownerDeleted')),
    powers: listFormat.format(powerKeys(entry.powersAfter).map((key) => t(key))),
  });
  return (
    <li className="flex flex-col gap-1 border-b border-border py-3 last:border-b-0">
      <span className="text-[15px] break-words text-heading">{text}</span>
      {entry.thread !== null && (
        <Link
          to={`/forums/${space.forumSlug}/${entry.thread.number}`}
          className="inline-flex min-h-6 items-center text-sm break-words text-link underline"
        >
          {entry.thread.title}
        </Link>
      )}
      {entry.note !== null && (
        <span className="text-sm break-words text-body">
          {t('log.reason', { reason: entry.note })}
        </span>
      )}
      <span className="text-[13px] text-meta">{postTime(entry.createdAt, i18n.language)}</span>
    </li>
  );
}
