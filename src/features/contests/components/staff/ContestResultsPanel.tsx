/**
 * ContestResultsPanel: judging and publishing a contest's results (story S1-E11-15 criteria 7
 * and 8; bundle CONTESTS-13b2b).
 *
 * Before entries close it says when judging starts. After, it explains how results show (winners
 * and finalists by pen name only, never age, school or real name) and offers "Publish results"
 * once at least one winner is chosen; the server checks again. Once published it says when and
 * offers "Issue certificates" (criterion 9; part 13b2c): every valid entry gets one, by pen name
 * only. The outcome of every judging change (placing, publishing, prize, certificates) is
 * announced here.
 * Who shows it: ContestEntriesSection, above the table.
 * What it calls: judge({ kind: 'publish' }) and judge({ kind: 'certificates' }) from
 * useContestEntries().
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

/**
 * Once the results are out: when they were published, and "Issue certificates". Issuing again is
 * safe: only certificates whose placing changed are touched (the database decides).
 */
function PublishedState({
  publishedAt,
  entries,
}: {
  publishedAt: string;
  entries: ContestEntries;
}) {
  const { t, i18n } = useContestTranslation();
  const date = formatRomaniaDateTime(new Date(publishedAt), i18n.language);
  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 text-sm text-body">{t('staff.results.publishedOn', { date })}</p>
      <p className="m-0 text-sm text-body">{t('staff.results.certificatesHint')}</p>
      <div>
        <Button
          type="button"
          variant="secondary"
          disabled={entries.isRunning}
          onClick={() => entries.judge({ kind: 'certificates', issued: 0 })}
        >
          {t('staff.results.issueCertificates')}
        </Button>
      </div>
    </div>
  );
}

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
    return <PublishedState publishedAt={contest.resultsPublishedAt} entries={entries} />;
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
  // "count" only matters for certificates ("2 certificates issued"); the other texts ignore it.
  const count = entries.lastJudging.kind === 'certificates' ? entries.lastJudging.issued : 0;
  return (
    <Notice tone="success">{t(`staff.results.done.${entries.lastJudging.kind}`, { count })}</Notice>
  );
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
