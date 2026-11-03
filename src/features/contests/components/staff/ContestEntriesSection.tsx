/**
 * ContestEntriesSection: one contest's entries in Staff › Contests, and Disqualify (story
 * S1-E11-15 criteria 5 and 6; bundle CONTESTS-13b2a).
 *
 * What it shows: each entry by pen name and age group only (never the year of birth or the user
 * ID), the story with a link to read it, its rating, its published words, the day it was entered
 * and its status (Valid, Withdrawn, Disqualified with the statement's reference). Staff never edit
 * an entry's words (architecture 1.8.5), so the only action is Disqualify on a valid entry, which
 * opens DisqualifyForm under the table. Plain staff components, no doodles.
 * Who shows it: ContestEditorPage, once the contest is open.
 * What it calls: useContestEntries().
 */
import { useState } from 'react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { formatRomaniaDate } from '@/lib/romania-time';
import type { StaffContestEntry } from '@/schemas/contests';

import { useContestEntries } from '../../hooks/useContestEntries';
import { useContestTranslation } from '../../registerContestTranslations';

import { DisqualifyForm } from './DisqualifyForm';

/** The status cell: the status, plus the statement's reference for a disqualified entry. */
function EntryStatus({ entry }: { entry: StaffContestEntry }) {
  const { t } = useContestTranslation();
  const status = t(`staff.entries.status.${entry.status}`);
  if (entry.statement_reference === null) return <>{status}</>;
  // A reinstated entry keeps the reference of the decision its appeal overturned.
  return <>{t('staff.entries.statusWithReference', { status, reference: entry.statement_reference })}</>;
}

/** One row of the table. */
function EntryRow({
  entry,
  onDisqualify,
}: {
  entry: StaffContestEntry;
  onDisqualify: (entry: StaffContestEntry) => void;
}) {
  const { t, i18n } = useContestTranslation();
  return (
    <tr className="border-t border-hairline align-top">
      <td className="py-3 pr-4 font-semibold text-ink">{entry.pen_name}</td>
      <td className="py-3 pr-4 text-body">
        {t(`staff.editor.ageGroups.${entry.age_group}`, {
          defaultValue: t('staff.entries.unknownAge'),
        })}
      </td>
      <td className="py-3 pr-4">
        <Link to={`/s/${entry.story_slug}`} className="text-link underline">
          {entry.story_title}
        </Link>
      </td>
      <td className="py-3 pr-4 text-body">{t(`staff.entries.ratings.${entry.rating}`)}</td>
      <td className="py-3 pr-4 text-body">{entry.words.toLocaleString(i18n.language)}</td>
      <td className="py-3 pr-4 text-body">
        {formatRomaniaDate(new Date(entry.entered_at), i18n.language)}
      </td>
      <td className="py-3 pr-4 text-body">
        <EntryStatus entry={entry} />
      </td>
      <td className="py-3">
        {entry.status === 'valid' && (
          <Button type="button" variant="secondary" onClick={() => onDisqualify(entry)}>
            {t('staff.entries.disqualifyEntry', { name: entry.pen_name })}
          </Button>
        )}
      </td>
    </tr>
  );
}

/** The column headings, in the order EntryRow fills them. */
const columnKeys = ['writer', 'age', 'story', 'rating', 'words', 'entered', 'status', 'action'];

/** The table of entries. */
function EntriesTable({
  entries,
  onDisqualify,
}: {
  entries: StaffContestEntry[];
  onDisqualify: (entry: StaffContestEntry) => void;
}) {
  const { t } = useContestTranslation();
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <caption className="sr-only">{t('staff.entries.heading')}</caption>
        <thead>
          <tr className="text-meta">
            {columnKeys.map((key) => (
              <th key={key} scope="col" className="pr-4 pb-2 font-semibold">
                {t(`staff.entries.columns.${key}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <EntryRow key={entry.id} entry={entry} onDisqualify={onDisqualify} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The list, a plain message, or nothing while it loads. */
function EntriesBody({
  entries,
  onDisqualify,
}: {
  entries: ReturnType<typeof useContestEntries>;
  onDisqualify: (entry: StaffContestEntry) => void;
}) {
  const { t } = useContestTranslation();
  if (entries.entries.isError) return <Notice tone="error">{t('staff.entries.loadFailed')}</Notice>;
  const list = entries.entries.data;
  if (list === undefined) return null;
  if (list.length === 0) return <p className="m-0 text-sm text-body">{t('staff.entries.empty')}</p>;
  return <EntriesTable entries={list} onDisqualify={onDisqualify} />;
}

/**
 * Renders the section.
 *
 * @param props.contestId - the contest
 * @returns the Entries section
 */
export function ContestEntriesSection({ contestId }: { contestId: string }) {
  const { t } = useContestTranslation();
  const entries = useContestEntries(contestId);
  const [chosen, setChosen] = useState<StaffContestEntry | null>(null);
  const done = chosen === null && entries.statementReference !== null;
  return (
    <section
      aria-labelledby="contest-entries-heading"
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5"
    >
      <h2
        id="contest-entries-heading"
        className="m-0 font-heading text-[20px] font-bold text-heading"
      >
        {t('staff.entries.heading')}
      </h2>
      <p className="m-0 text-sm text-body">{t('staff.entries.intro')}</p>
      <EntriesBody entries={entries} onDisqualify={setChosen} />
      {chosen !== null && (
        <DisqualifyForm entry={chosen} entries={entries} onClose={() => setChosen(null)} />
      )}
      <div aria-live="polite">
        {done && (
          <Notice tone="success">
            {t('staff.entries.disqualified', { reference: entries.statementReference })}
          </Notice>
        )}
      </div>
    </section>
  );
}
