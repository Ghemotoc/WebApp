/**
 * ChapterClassPoints: class points at the end of a chapter shared with a class (bundle
 * CLASS-POINTS, part 1; stories S1-E8-13 and S1-E8-14; bundle BOOKS-8, boards G05-ClassGive and
 * G06-ClassReceived, user stories 8.5 and 8.6).
 *
 * What it shows depends on who reads the chapter, and the database decides which:
 * - a classmate (board G05): "Give class points", who sees what, the form (GivePointsForm) and
 *   no counter; under the box, "How class points work";
 * - the writer (board G06): "Points this chapter received", "Only you see this box.", the figures
 *   and notes (ReceivedPoints); under the box, "About these points" and "Open the threads";
 * - the teacher: the total from classmates as a guide and the teacher points form.
 * Anyone else, and any chapter outside a class with points on, gets nothing at all. One tinted
 * box like the class page's points box (bg-surface-solid), no doodles.
 * The boards draw the classmate's box under the chapter and the writer's above it; it stays at the
 * chapter's end for both, loaded only when the reader gets near it, so the chapter reader's first
 * download never grows (docs/board-fixes.md, BOOKS-8).
 * Who shows it: ChapterClassPointsWhenNear, at the end of the chapter reader.
 * What it calls: useChapterClassPoints → class_chapter_points(), which also records that a
 * classmate opened the chapter (points follow reading, criterion 4).
 */
import { Link } from 'react-router';

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
  if (points.isLocked) return <p className="m-0 text-ink-muted">{t('chapter.give.locked')}</p>;
  if (!points.giving.canGive)
    return <p className="m-0 text-ink-muted">{t('chapter.give.notOffered')}</p>;
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
      <p className="m-0 text-ink-muted">
        {t('chapter.teacher.classTotal', { count: points.received?.total ?? 0 })}
      </p>
      {points.isLocked ? (
        <p className="m-0 text-ink-muted">{t('chapter.give.locked')}</p>
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

/** The heading and line at the top of the box, for each role. */
const headings = {
  classmate: { title: 'chapter.give.title', line: 'chapter.give.intro' },
  writer: { title: 'chapter.received.title', line: 'chapter.received.onlyYou' },
  teacher: { title: 'chapter.heading', line: 'chapter.inClass' },
} as const;

/**
 * The few lines under the box: how points work for a classmate, what teacher points are for the
 * writer, nothing for the teacher.
 *
 * @param props.points - the chapter's class points
 * @returns the section, or null
 */
function UnderTheBox({ points }: { points: ChapterPoints }) {
  const { t } = useClassPointsTranslation();
  if (points.role === 'classmate' && points.giving !== null) {
    return (
      <section aria-labelledby="class-points-how" className="flex flex-col gap-2">
        <h3 id="class-points-how" className="m-0 type-subheading text-ink-heading">
          {t('chapter.how.title')}
        </h3>
        <p className="m-0 type-body text-ink-muted">
          {t('chapter.how.body', { budget: points.giving.budget, cap: points.giving.cap })}
        </p>
      </section>
    );
  }
  if (points.role !== 'writer') return null;
  return (
    <section aria-labelledby="class-points-about" className="flex flex-col gap-2">
      <h3 id="class-points-about" className="m-0 type-subheading text-ink-heading">
        {t('chapter.about.title')}
      </h3>
      <p className="m-0 type-body text-ink-muted">{t('chapter.about.body')}</p>
      <Link
        to={`/spaces/${points.classSlug}`}
        className="w-fit py-2 type-body font-semibold text-ink-heading underline"
      >
        {t('chapter.about.openThreads')}
      </Link>
    </section>
  );
}

/**
 * Renders the section, or nothing when the chapter has no class points for this reader.
 *
 * @param props.chapterId - the chapter's row ID
 * @returns the box and the lines under it
 */
export function ChapterClassPoints({ chapterId }: { chapterId: string }) {
  const { t } = useClassPointsTranslation();
  const read = useChapterClassPoints(chapterId);
  if (read.isError) return <Notice tone="error">{t('card.loadFailed')}</Notice>;
  const points = read.data;
  if (points === undefined || points === null) return null;
  const heading = headings[points.role];
  return (
    <div className="flex flex-col gap-6 font-body">
      <section
        aria-labelledby="chapter-class-points-heading"
        className="flex flex-col gap-4 rounded-card bg-surface-solid p-4 md:p-6"
      >
        <header className="flex flex-col gap-1">
          <h2 id="chapter-class-points-heading" className="m-0 type-subheading text-ink-heading">
            {t(heading.title)}
          </h2>
          <p className="m-0 type-body text-ink-muted">
            {t(heading.line, { name: points.className })}
          </p>
        </header>
        {points.role === 'classmate' && <ClassmatePart chapterId={chapterId} points={points} />}
        {points.role === 'writer' && <ReceivedPoints points={points} />}
        {points.role === 'teacher' && <TeacherPart chapterId={chapterId} points={points} />}
      </section>
      <UnderTheBox points={points} />
    </div>
  );
}
