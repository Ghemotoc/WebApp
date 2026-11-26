/**
 * TeacherNoteCard: the teacher's private note on a pupil's chapter, in a tinted box (bundle
 * BOOKS-8; board G06-ClassReceived, user story 8.6; the note itself is CLASS-POINTS, S1-E8-14).
 *
 * Who shows it: ReceivedPoints, for the chapter's writer.
 * What it shows: "Note from the teacher · Only you, the teacher and the moderation team", the note
 * in quotation marks and Report. The note has no reply box: it is feedback on a piece of work, not
 * a conversation (Robert, 13 Nov 2026, 19:15 UTC). The pupil can report it, like any text written
 * for someone else (CLAUDE.md rule 6; DSA art. 16).
 * What it calls: MetaLine and the shared ReportButton.
 */
import { MetaLine } from '@/components/ui/MetaLine';
import { ReportButton } from '@/features/reporting/components/ReportButton';

import { useClassPointsTranslation } from '../registerClassPointsTranslations';

/**
 * Renders the note.
 *
 * @param props.teacherPointsId - the teacher points row, which the Report button sends
 * @param props.note - the note's words
 * @returns the box
 */
export function TeacherNoteCard({
  teacherPointsId,
  note,
}: {
  teacherPointsId: string;
  note: string;
}) {
  const { t } = useClassPointsTranslation();
  return (
    <div className="flex flex-col gap-2 rounded-field bg-tint p-4">
      <MetaLine
        facts={[
          { text: t('chapter.teacher.noteFrom') },
          { text: t('chapter.teacher.noteAudienceShort'), kind: 'state' },
        ]}
      />
      <p className="m-0 type-body text-ink [overflow-wrap:anywhere] whitespace-pre-line">
        {t('chapter.quoted', { text: note })}
      </p>
      <span className="self-start">
        <ReportButton
          itemType="class_teacher_note"
          itemReference={teacherPointsId}
          itemLabel={t('chapter.teacher.reportNote')}
        />
      </span>
    </div>
  );
}
