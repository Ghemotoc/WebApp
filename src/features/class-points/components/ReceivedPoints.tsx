/**
 * ReceivedPoints: what the writer sees about class points on their own chapter (bundle
 * CLASS-POINTS, part 1; story S1-E8-13 criterion 7; bundle BOOKS-8, board G06-ClassReceived,
 * user story 8.6).
 *
 * What it shows (board G06): two figures side by side, "Class points 9 from classmates" and
 * "Teacher points 7 out of 10"; the teacher's note in a tinted box; "Notes from classmates (3)"
 * as rows, each with Report; and the line on who sees what. Never who gave or wrote anything, and
 * never anyone else's points.
 * Who shows it: ChapterClassPoints, for the chapter's writer. What it calls: ReportButton and
 * TeacherNoteCard.
 */
import { ReportButton } from '@/features/reporting/components/ReportButton';

import type { ChapterClassPoints } from '../api/classPoints';
import { useClassPointsTranslation } from '../registerClassPointsTranslations';

import { TeacherNoteCard } from './TeacherNoteCard';

/**
 * One figure: a label, a big number (or words when there is none yet) and a line under it.
 *
 * @param props.label - what the figure counts
 * @param props.value - the number, or the words when there is none
 * @param props.under - the line under it
 * @returns the figure
 */
function Figure({ label, value, under }: { label: string; value: string; under: string }) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex flex-col gap-1 border-t border-hairline pt-4"
    >
      <span className="type-body text-ink-muted">{label}</span>
      <span className="font-heading type-title font-bold text-ink-heading">{value}</span>
      <span className="type-meta text-ink-muted">{under}</span>
    </div>
  );
}

/**
 * The classmates' notes as rows, each with its Report button.
 *
 * @param props.notes - the notes, without names
 * @returns the heading and the list
 */
function ClassmateNotes({ notes }: { notes: { id: string; note: string }[] }) {
  const { t } = useClassPointsTranslation();
  return (
    <div className="flex flex-col">
      <h3 className="m-0 pb-2 type-body font-semibold text-ink-heading">
        {t('chapter.received.notesHeading', { count: notes.length })}
      </h3>
      <ul className="m-0 flex list-none flex-col p-0">
        {notes.map((note) => (
          <li
            key={note.id}
            className="flex flex-wrap items-center gap-3 border-t border-hairline py-3"
          >
            <span className="min-w-0 flex-1 type-body text-ink [overflow-wrap:anywhere]">
              {t('chapter.quoted', { text: note.note })}
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
  );
}

/**
 * Renders the writer's view.
 *
 * @param props.points - the chapter's class points, as the writer may see them
 * @returns the two figures, the teacher's note, the classmates' notes and the line under them
 */
export function ReceivedPoints({ points }: { points: ChapterClassPoints }) {
  const { t } = useClassPointsTranslation();
  const received = points.received ?? { total: 0, notes: [] };
  const teacherValue =
    points.teacher === null ? t('chapter.received.noneYet') : String(points.teacher.points);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Figure
          label={t('chapter.received.classPoints')}
          value={String(received.total)}
          under={t('chapter.received.fromClassmates')}
        />
        <Figure
          label={t('chapter.received.teacherPoints')}
          value={teacherValue}
          under={t('chapter.received.outOf', { max: points.teacherMax })}
        />
      </div>
      {points.teacher?.note != null && (
        <TeacherNoteCard teacherPointsId={points.teacher.id} note={points.teacher.note} />
      )}
      {received.notes.length > 0 && <ClassmateNotes notes={received.notes} />}
      <p className="m-0 max-w-none type-meta text-ink-muted">{t('chapter.received.footnote')}</p>
    </div>
  );
}
