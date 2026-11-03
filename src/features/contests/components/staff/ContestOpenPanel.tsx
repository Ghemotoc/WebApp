/**
 * ContestOpenPanel: whether a contest is open, what still stops it from opening, and "Open the
 * contest" (story S1-E11-15 criterion 2; bundle CONTESTS-13b1).
 *
 * Opening is refused until every detail is saved, the full rules are published as a help page in
 * Romanian and English and the live landing page links to them; the panel lists each thing to fix
 * and the button stays off until the list is empty. The server checks again on Open.
 * Who shows it: ContestEditorPage. What it calls: open() from useContestEditor().
 */
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { formatRomaniaDateTime } from '@/lib/romania-time';

import type { StaffContest } from '../../api/contests';
import type { useContestEditor } from '../../hooks/useStaffContests';
import { useContestTranslation } from '../../registerContestTranslations';

import { ProblemList } from './ProblemList';

/** The editor's state from the hook. */
type ContestEditor = ReturnType<typeof useContestEditor>;

/** The panel's body before the contest opens: the list to fix, or Open. */
function NotOpenYet({ editor }: { editor: ContestEditor }) {
  const { t } = useContestTranslation();
  const refused = editor.failure !== null && editor.failure.reason === 'not_ready';
  return (
    <>
      {editor.problems.length > 0 ? (
        <div className="flex flex-col gap-1 text-body">
          <p className="m-0 text-sm font-semibold text-ink">{t('staff.editor.notReady')}</p>
          <ProblemList problems={editor.problems} />
        </div>
      ) : (
        <p className="m-0 text-sm text-body">{t('staff.editor.ready')}</p>
      )}
      <div>
        <Button
          type="button"
          disabled={editor.isBusy || editor.problems.length > 0}
          onClick={editor.open}
        >
          {t('staff.editor.open')}
        </Button>
      </div>
      {refused && <Notice tone="error">{t('staff.editor.failures.not_ready')}</Notice>}
    </>
  );
}

/**
 * Renders the panel.
 *
 * @param props.contest - the contest
 * @param props.editor - the editor's state and actions
 * @returns the section
 */
export function ContestOpenPanel({
  contest,
  editor,
}: {
  contest: StaffContest;
  editor: ContestEditor;
}) {
  const { t, i18n } = useContestTranslation();
  return (
    <section
      aria-labelledby="contest-open-heading"
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5"
      aria-live="polite"
    >
      <h2 id="contest-open-heading" className="m-0 font-heading text-[20px] font-bold text-heading">
        {t('staff.editor.openHeading')}
      </h2>
      {contest.openedAt === null ? (
        <NotOpenYet editor={editor} />
      ) : (
        <p className="m-0 text-sm text-body">
          {t('staff.editor.openSince', {
            date: formatRomaniaDateTime(new Date(contest.openedAt), i18n.language),
          })}
        </p>
      )}
    </section>
  );
}
