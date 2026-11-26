/**
 * SpaceLogTable: a space's moderation log as the board's table, "When", "Who" and "What
 * happened", inside a box that scrolls sideways on its own on a narrow screen, so the page never
 * does (rule 21) (bundle BOOKS-7, board F12).
 *
 * The scrolling box is a labelled, focusable region, so a keyboard can scroll it too (DoD: no
 * scrollbars, every scrolling box reachable by keyboard).
 * Who shows it: SpaceLogPage. What it calls: SpaceLogLine for each row.
 */
import type { SpaceLogEntry } from '../api/spaceModeration';
import type { Space } from '../api/spaces';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { SpaceLogLine } from './SpaceLogLine';

/** The header cell style the board draws: small, muted, a line under it. */
const headerCell = 'border-b border-border p-3 text-left type-meta font-semibold text-ink-muted';

/**
 * Renders the table.
 *
 * @param props.entries - the lines so far, newest first
 * @param props.space - the space, for the thread links
 * @returns the scrolling region with the table
 */
export function SpaceLogTable({ entries, space }: { entries: SpaceLogEntry[]; space: Space }) {
  const { t } = useSpacesTranslation();
  return (
    <div
      className="max-w-full overflow-x-auto"
      tabIndex={0}
      role="region"
      aria-label={t('log.title')}
    >
      <table className="w-full min-w-[640px] border-collapse">
        <thead>
          <tr>
            <th scope="col" className={`${headerCell} w-1/6`}>
              {t('log.when')}
            </th>
            <th scope="col" className={`${headerCell} w-1/5`}>
              {t('log.who')}
            </th>
            <th scope="col" className={headerCell}>
              {t('log.what')}
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, position) => (
            <SpaceLogLine key={`${entry.createdAt}-${position}`} entry={entry} space={space} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
