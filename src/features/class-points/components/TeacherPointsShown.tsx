/**
 * TeacherPointsShown: "Teacher points: 7" and the teacher's private note, as the pupil reads them
 * on their own chapter or reply (bundle CLASS-POINTS, part 1; story S1-E8-14).
 *
 * The note has no reply box: it is feedback on a piece of work, not a conversation (Robert,
 * 13 Nov 2026, 19:15 UTC). The pupil can report it, like any text written for someone else
 * (CLAUDE.md rule 6; DSA art. 16).
 * Who shows it: ChapterClassPoints and ReplyTeacherPoints, for the pupil whose work it is.
 * What it calls: the shared ReportButton.
 */
import { ReportButton } from '@/features/reporting/components/ReportButton';

import type { TeacherPoints } from '../api/classPoints';
import { useClassPointsTranslation } from '../registerClassPointsTranslations';

/**
 * Renders the points and the note.
 *
 * @param props.teacher - the teacher's points on this piece of work
 * @returns the line, and the note with its Report button when there is one
 */
export function TeacherPointsShown({ teacher }: { teacher: TeacherPoints }) {
  const { t } = useClassPointsTranslation();
  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 font-semibold text-ink">
        {t('chapter.teacher.shown', { points: teacher.points })}
      </p>
      {teacher.note !== null && (
        <div className="flex flex-col gap-1.5 rounded-card border border-border bg-panel p-4">
          <h3 className="m-0 text-sm font-semibold text-ink">{t('chapter.teacher.noteHeading')}</h3>
          <p className="m-0 text-body [overflow-wrap:anywhere] whitespace-pre-line">
            {teacher.note}
          </p>
          <p className="m-0 text-sm text-meta">{t('chapter.teacher.noteAudience')}</p>
          <span className="self-start">
            <ReportButton
              itemType="class_teacher_note"
              itemReference={teacher.id}
              itemLabel={t('chapter.teacher.reportNote')}
            />
          </span>
        </div>
      )}
    </div>
  );
}
