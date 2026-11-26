/**
 * WinnerNotice: "You're the winner", the notice the Winner sees the first time they open the class
 * after the results came out (bundle BOOKS-8, part 8c; board G13, user story 8.13: "Done closes
 * it.").
 *
 * What it shows: a centred dialog with who picked the winning story for which competition, what
 * the class page shows once it is closed (one Winner card, no scores or points), a Winner box with
 * the competition, the story and "by" the Winner's pen name, then Done (main) and "Read the
 * chapter again". Done, the Close × and Escape all close it, and the database remembers that, so
 * it never comes back on any device. If closing fails, the notice shows again, so Done can be
 * pressed once more.
 * Who shows it: ClassLatestWinner, on the class page, which reads the notice with
 * useWinnerNotice() (class_winner_notice(); only the Winner ever gets one) and loads this file only
 * when one is due, so the class page carries no dialog code for anyone else.
 * What it calls: Sheet; Done calls the onDone it is given (dismiss_class_winner_notice()).
 */
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { buttonClassName } from '@/components/ui/buttonStyles';
import { ButtonRow } from '@/components/ui/ButtonRow';
import { MetaLine } from '@/components/ui/MetaLine';
import { Sheet } from '@/components/ui/Sheet';

import type { WinnerNotice as WinnerNoticeData } from '../api/winnerNotice';
import { useClassCompetitionsTranslation } from '../registerClassCompetitionsTranslations';

/**
 * The Winner box: the competition, the story and "by" the pen name.
 *
 * @param props.notice - the notice
 * @returns the box
 */
function WinnerBox({ notice }: { notice: WinnerNoticeData }) {
  const { t } = useClassCompetitionsTranslation();
  return (
    <section
      aria-label={t('notice.boxLabel', { name: notice.name })}
      className="flex min-w-0 flex-col gap-1 rounded-card bg-surface-solid p-4 sm:p-6"
    >
      <MetaLine facts={[{ text: t('winner.eyebrow'), kind: 'state' }, { text: notice.name }]} />
      {notice.winningChapter !== null && (
        <p className="m-0 type-subheading break-words text-ink-heading">
          {notice.winningChapter.storyTitle}
        </p>
      )}
      <p className="m-0 type-meta text-ink-muted">{t('winner.by', { name: notice.winnerName })}</p>
    </section>
  );
}

/**
 * The notice's words, box and buttons.
 *
 * @param props.notice - the notice
 * @param props.onDone - closes it for good
 * @returns the dialog's body
 */
function WinnerNoticeBody({ notice, onDone }: { notice: WinnerNoticeData; onDone: () => void }) {
  const { t } = useClassCompetitionsTranslation();
  const chapter = notice.winningChapter;
  const values = { teacher: notice.teacherName, competition: notice.name };
  const picked =
    chapter === null
      ? t('notice.pickedYou', values)
      : t('notice.pickedStory', { ...values, story: chapter.storyTitle });
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="m-0 type-body text-ink">{picked}</p>
        <p className="m-0 type-body text-ink-muted">{t('notice.afterClose', values)}</p>
      </div>
      <WinnerBox notice={notice} />
      {/* Done first, on the left: the main action (DoD, button rows). */}
      <ButtonRow>
        <Button size="lg" onClick={onDone}>
          {t('notice.done')}
        </Button>
        {chapter !== null && (
          <Link
            to={`/s/${chapter.storySlug}/${chapter.chapterCode}`}
            className={buttonClassName({ variant: 'secondary', size: 'lg' })}
            onClick={onDone}
          >
            {t('notice.readAgain')}
          </Link>
        )}
      </ButtonRow>
    </div>
  );
}

/**
 * Renders the notice.
 *
 * @param props.notice - the notice that is due
 * @param props.onDone - closes it for good (Done, the Close × and Escape)
 * @returns the dialog
 */
export function WinnerNotice({ notice, onDone }: { notice: WinnerNoticeData; onDone: () => void }) {
  const { t } = useClassCompetitionsTranslation();
  return (
    <Sheet isOpen onClose={onDone} title={t('notice.title')} placement="centre">
      <WinnerNoticeBody notice={notice} onDone={onDone} />
    </Sheet>
  );
}
