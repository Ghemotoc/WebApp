/**
 * EntryJudging: the Placing and Prize cells of one row in a contest's entries (story S1-E11-15
 * criteria 7 and 10; bundle CONTESTS-13b2b).
 *
 * Placing: once entries close, staff choose Winner, Finalist or None for a valid entry. Judges are
 * our staff plus any named partner judges who tell staff their choice; there is no public vote and
 * a sponsor has no say (criterion 7, proposal).
 * Prize: once the results are out, staff mark a winner's prize as sent. For a winner under 16 (or
 * whose age isn't known) they must first tick that a parent's or guardian's consent for the
 * delivery details is on file (criterion 10, proposal). The details themselves never go into the
 * app. Plain staff components, no doodles.
 * Who shows it: EntryRow in ContestEntriesSection. What it calls: judge() from useContestEntries().
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { formatRomaniaDate } from '@/lib/romania-time';
import type { ContestPlacing, StaffContestEntry } from '@/schemas/contests';

import type { useContestEntries } from '../../hooks/useContestEntries';
import { useContestTranslation } from '../../registerContestTranslations';

/** The entries' state and actions from the hook. */
type ContestEntries = ReturnType<typeof useContestEntries>;

/**
 * The Placing cell: a choice once judging is open, otherwise the placing as text.
 *
 * @param props.entry - the entry
 * @param props.entries - the hook's state and actions
 * @param props.canJudge - true once entries have closed
 * @returns the cell's content
 */
export function PlacingControl({
  entry,
  entries,
  canJudge,
}: {
  entry: StaffContestEntry;
  entries: ContestEntries;
  canJudge: boolean;
}) {
  const { t } = useContestTranslation();
  const current = entry.placing ?? 'none';
  if (!canJudge || entry.status !== 'valid') return <>{t(`staff.results.placings.${current}`)}</>;
  return (
    <Select
      id={`placing-${entry.id}`}
      label={t('staff.results.placingFor', { name: entry.pen_name })}
      value={current}
      onChange={(value) =>
        entries.judge({
          kind: 'placing',
          entryId: entry.id,
          placing: value === 'none' ? null : (value as ContestPlacing),
        })
      }
      options={['none', 'finalist', 'winner'].map((value) => ({
        value,
        label: t(`staff.results.placings.${value}`),
      }))}
    />
  );
}

/** "Mark prize sent", with the parent's consent box when the winner is under 16. */
function MarkPrizeSent({ entry, entries }: { entry: StaffContestEntry; entries: ContestEntries }) {
  const { t } = useContestTranslation();
  const [consentOnFile, setConsentOnFile] = useState(false);
  const isBlocked = entry.needs_parent_consent && !consentOnFile;
  return (
    <div className="flex flex-col gap-2">
      {entry.needs_parent_consent && (
        <label className="flex min-h-11 items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            className="size-5 accent-primary"
            checked={consentOnFile}
            onChange={(event) => setConsentOnFile(event.target.checked)}
          />
          {t('staff.results.parentConsent')}
        </label>
      )}
      <Button
        type="button"
        variant="secondary"
        disabled={isBlocked || entries.isRunning}
        onClick={() =>
          entries.judge({ kind: 'prize', entryId: entry.id, parentConsentOnFile: consentOnFile })
        }
      >
        {t('staff.results.markPrizeSent', { name: entry.pen_name })}
      </Button>
    </div>
  );
}

/**
 * The Prize cell: nothing for anyone but a valid winner once the results are out; then the day
 * it was sent, or "Mark prize sent".
 *
 * @param props.entry - the entry
 * @param props.entries - the hook's state and actions
 * @param props.resultsPublished - true once the results are public
 * @returns the cell's content
 */
export function PrizeControl({
  entry,
  entries,
  resultsPublished,
}: {
  entry: StaffContestEntry;
  entries: ContestEntries;
  resultsPublished: boolean;
}) {
  const { t, i18n } = useContestTranslation();
  if (entry.status !== 'valid' || entry.placing !== 'winner' || !resultsPublished) return null;
  if (entry.prize_sent_at !== null) {
    const date = formatRomaniaDate(new Date(entry.prize_sent_at), i18n.language);
    return <>{t('staff.results.prizeSentOn', { date })}</>;
  }
  return <MarkPrizeSent entry={entry} entries={entries} />;
}
