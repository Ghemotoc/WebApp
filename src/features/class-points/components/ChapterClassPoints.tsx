/**
 * ChapterClassPoints: class points at the end of a chapter shared with a class (bundle
 * CLASS-POINTS, part 1; stories S1-E8-13 and S1-E8-14).
 *
 * What it shows depends on who reads the chapter, and the database decides which:
 * - a classmate: the form to give this week's points (GivePointsForm), and no counter;
 * - the writer: the points received, classmates' lines and the teacher's points (ReceivedPoints);
 * - the teacher: the total from classmates as a guide and the teacher points form.
 * Anyone else, and any chapter outside a class with points on, gets nothing at all. Plain card,
 * no doodles (the chapter reader has none).
 * Who shows it: ChapterClassPointsWhenNear, at the end of the chapter reader.
 * What it calls: useChapterClassPoints → class_chapter_points(), which also records that a
 * classmate opened the chapter (points follow reading, criterion 4).
 */
import { Notice } from '@/components/ui/Notice';

import type { ChapterClassPoints as ChapterPoints } from '../api/classPoints';
import { useChapterClassPoints } from '../hooks/useClassPoints';
import { useClassPointsTranslation } from '../registerClassPointsTranslations';

import { GivePointsForm } from './GivePointsForm';
import { ReceivedPoints } from './ReceivedPoints';
import { TeacherPointsForm } from './TeacherPointsForm';

/**
 * The part for a classmate: the form, or why there is none.
 *
 * @returns the form or a line
 */
function ClassmatePart({ chapterId, points }: { chapterId: string; points: ChapterPoints }) {
  const { t } = useClassPointsTranslation();
  if (points.giving === null) return null;
  if (points.isLocked) return <p className="m-0 text-body">{t('chapter.give.locked')}</p>;
  if (!points.giving.canGive)
    return <p className="m-0 text-body">{t('chapter.give.notOffered')}</p>;
  return <GivePointsForm chapterId={chapterId} giving={points.giving} />;
}

/**
 * The part for the teacher: the classmates' total as a guide, then the form.
 *
 * @returns the line and the form
 */
function TeacherPart({ chapterId, points }: { chapterId: string; points: ChapterPoints }) {
  const { t } = useClassPointsTranslation();
  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-body">
        {t('chapter.teacher.classTotal', { count: points.received?.total ?? 0 })}
      </p>
      {points.isLocked ? (
        <p className="m-0 text-body">{t('chapter.give.locked')}</p>
      ) : (
        <TeacherPointsForm
          kind="chapter"
          targetId={chapterId}
          current={points.teacher}
          max={points.teacherMax}
          areNotesOn={points.areNotesOn}
          noteMax={points.teacherNoteMax}
        />
      )}
    </div>
  );
}

/**
 * Renders the section, or nothing when the chapter has no class points for this reader.
 *
 * @param props.chapterId - the chapter's row ID
 * @returns the section
 */
export function ChapterClassPoints({ chapterId }: { chapterId: string }) {
  const { t } = useClassPointsTranslation();
  const read = useChapterClassPoints(chapterId);
  if (read.isError) return <Notice tone="error">{t('card.loadFailed')}</Notice>;
  const points = read.data;
  if (points === undefined || points === null) return null;
  return (
    <section
      aria-labelledby="chapter-class-points-heading"
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 font-body shadow-card md:p-6"
    >
      <header className="flex flex-col gap-1">
        <h2
          id="chapter-class-points-heading"
          className="m-0 font-heading text-2xl font-bold text-heading"
        >
          {t('chapter.heading')}
        </h2>
        <p className="m-0 text-sm text-meta">{t('chapter.inClass', { name: points.className })}</p>
      </header>
      {points.role === 'classmate' && <ClassmatePart chapterId={chapterId} points={points} />}
      {points.role === 'writer' && <ReceivedPoints points={points} />}
      {points.role === 'teacher' && <TeacherPart chapterId={chapterId} points={points} />}
    </section>
  );
}
