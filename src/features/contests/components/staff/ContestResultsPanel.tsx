/**
 * ContestResultsPanel: judging and publishing a contest's results (story S1-E11-15 criteria 7
 * and 8; bundle CONTESTS-13b2b).
 *
 * Before entries close it says when judging starts. After, it explains how results show (winners
 * and finalists by pen name only, never age, school or real name) and offers "Publish results"
 * once at least one winner is chosen; the server checks again. Once published it says when. The
 * outcome of every judging change (placing, publishing, prize) is announced here.
 * Who shows it: ContestEntriesSection, above the table.
 * What it calls: judge({ kind: 'publish' }) from useContestEntries().
 */
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { formatRomaniaDateTime } from '@/lib/romania-time';

import type { StaffContest } from '../../api/contests';
import type { useContestEntries } from '../../hooks/useContestEntries';
import { contestDayInWords } from '../../lib/contestWords';
import { useContestTranslation } from '../../registerContestTranslations';

/** The entries' state and actions from the hook. */
type ContestEntries = ReturnType<typeof useContestEntries>;

/** The panel's main line and, when it can, the Publish button. */
function ResultsState({
  contest,
  entries,
  entriesClosed,
}: {
  contest: StaffContest;
  entries: ContestEntries;
  entriesClosed: boolean;
}) {
  const { t, i18n } = useContestTranslation();
  if (!entriesClosed) {
    const date = contestDayInWords(contest.entries_close_on ?? '', i18n.language);
    return <p className="m-0 text-sm text-body">{t('staff.results.afterClose', { date })}</p>;
  }
  if (contest.resultsPublishedAt !== null) {
    const date = formatRomaniaDateTime(new Date(contest.resultsPublishedAt), i18n.language);
    return <p className="m-0 text-sm text-body">{t('staff.results.publishedOn', { date })}</p>;
  }
  const hasWinner = (entries.entries.data ?? []).some(
    (entry) => entry.status === 'valid' && entry.placing === 'winner',
  );
  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 text-sm text-body">{t('staff.results.howTheyShow')}</p>
      <div>
        <Button
          type="button"
          disabled={!hasWinner || entries.isRunning}
          onClick={() => entries.judge({ kind: 'publish' })}
        >
          {t('staff.results.publish')}
        </Button>
      </div>
      {!hasWinner && <p className="m-0 text-sm text-body">{t('staff.results.needWinner')}</p>}
    </div>
  );
}

/** What the last judging change did, or why it failed. */
function JudgingNotice({ entries }: { entries: ContestEntries }) {
  const { t } = useContestTranslation();
  if (entries.judgingFailure !== null) {
    return (
      <Notice tone="error">
        {t(`staff.results.failures.${entries.judgingFailure.reason}`, {
          defaultValue: t('staff.results.failures.failed'),
        })}
      </Notice>
    );
  }
  if (entries.lastJudging === null) return null;
  return <Notice tone="success">{t(`staff.results.done.${entries.lastJudging.kind}`)}</Notice>;
}

/**
 * Renders the panel.
 *
 * @param props.contest - the contest
 * @param props.entries - the hook's state and actions
 * @param props.entriesClosed - true once the last entry day is over (Romanian time)
 * @returns the panel
 */
export function ContestResultsPanel({
  contest,
  entries,
  entriesClosed,
}: {
  contest: StaffContest;
  entries: ContestEntries;
  entriesClosed: boolean;
}) {
  const { t } = useContestTranslation();
  return (
    <div className="flex flex-col gap-2 border-b border-hairline pb-4">
      <h3 className="m-0 font-heading text-[18px] font-bold text-heading">
        {t('staff.results.heading')}
      </h3>
      <ResultsState contest={contest} entries={entries} entriesClosed={entriesClosed} />
      <div aria-live="polite">
        <JudgingNotice entries={entries} />
      </div>
    </div>
  );
}
