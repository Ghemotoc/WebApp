/**
 * ReceivedPoints: what the writer sees about class points on their own chapter (bundle
 * CLASS-POINTS, part 1; story S1-E8-13 criterion 7).
 *
 * What it shows: how many points classmates gave the chapter, the lines they wrote with them
 * (never who gave or wrote anything, and never anyone else's points), and the teacher's points
 * and note. Each line can be reported like a comment.
 * Who shows it: ChapterClassPoints, for the chapter's writer. What it calls: ReportButton and
 * TeacherPointsShown.
 */
import { ReportButton } from '@/features/reporting/components/ReportButton';

import type { ChapterClassPoints } from '../api/classPoints';
import { useClassPointsTranslation } from '../registerClassPointsTranslations';

import { TeacherPointsShown } from './TeacherPointsShown';

/**
 * Renders the writer's view.
 *
 * @param props.points - the chapter's class points, as the writer may see them
 * @returns the total, the notes and the teacher's points
 */
export function ReceivedPoints({ points }: { points: ChapterClassPoints }) {
  const { t } = useClassPointsTranslation();
  const received = points.received ?? { total: 0, notes: [] };
  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 font-semibold text-ink">
        {received.total === 0
          ? t('chapter.received.none')
          : t('chapter.received.total', { count: received.total })}
      </p>
      {received.notes.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="m-0 text-sm font-semibold text-ink">
            {t('chapter.received.notesHeading')}
          </h3>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {received.notes.map((note) => (
              <li
                key={note.id}
                className="flex flex-wrap items-center gap-3 rounded-card border border-border bg-panel px-4 py-3"
              >
                <span className="min-w-0 flex-1 text-body [overflow-wrap:anywhere]">
                  {note.note}
                </span>
                <ReportButton
                  itemType="class_point_note"
                  itemReference={note.id}
                  itemLabel={t('chapter.received.reportNote')}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
      {points.teacher !== null && <TeacherPointsShown teacher={points.teacher} />}
    </div>
  );
}
