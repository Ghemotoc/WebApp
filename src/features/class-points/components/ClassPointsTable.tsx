/**
 * ClassPointsTable: the teacher's table of class points and teacher points, pupil by pupil
 * (bundle CLASS-POINTS, part 1; story S1-E8-14 criterion 3).
 *
 * What it shows: one row per pupil with their points from classmates and from the teacher, side
 * by side; the column headings sort by name or by either number. There are no rank numbers and
 * no medals, a pupil with no class points reads "No class points yet", and nothing says who gave
 * points (Robert, 13 Nov 2026, decisions 2 and 8). Under each pupil, their chapters shared with
 * the class, each with "Report points as suspicious" (ReportPointsControl).
 * Who shows it: ClassPointsPage, for the class's teacher. What it calls: nothing itself.
 */
import { useState } from 'react';
import { Link } from 'react-router';

import { cn } from '@/lib/utils';

import type { TableChapter, TablePupil } from '../api/classPointsTable';
import { type PupilSort, sortedPupils } from '../lib/sortPupils';
import { useClassPointsTranslation } from '../registerClassPointsTranslations';

import { ReportPointsControl } from './ReportPointsControl';

/** The three columns and the sort each one's heading sets. */
const columns: { sort: PupilSort; labelKey: 'pupil' | 'class' | 'teacher'; isNumber: boolean }[] = [
  { sort: 'name', labelKey: 'pupil', isNumber: false },
  { sort: 'class', labelKey: 'class', isNumber: true },
  { sort: 'teacher', labelKey: 'teacher', isNumber: true },
];

/**
 * What a column heading tells a screen reader about the sort.
 *
 * @param column - the heading's sort
 * @param isNumber - numbers sort largest first, names A to Z
 * @param chosen - the sort in use
 * @returns the aria-sort value
 */
function ariaSortOf(column: PupilSort, isNumber: boolean, chosen: PupilSort) {
  if (column !== chosen) return 'none';
  return isNumber ? 'descending' : 'ascending';
}

/**
 * One chapter under a pupil: its link, its two numbers and the report control.
 *
 * @returns the list item
 */
function ChapterLine({ chapter }: { chapter: TableChapter }) {
  const { t } = useClassPointsTranslation();
  const name = t('table.chapterLine', {
    story: chapter.storyTitle,
    number: chapter.chapterPosition,
  });
  return (
    <li className="flex flex-col gap-2 border-t border-border py-3 first:border-t-0">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Link
          to={`/s/${chapter.storySlug}/${chapter.chapterCode}`}
          className="font-semibold text-link underline [overflow-wrap:anywhere]"
        >
          {name}
        </Link>
        <span className="text-sm text-body">
          {t('table.chapterClass', { count: chapter.classPoints })},{' '}
          {chapter.teacherPoints === null
            ? t('table.chapterNoTeacher')
            : t('table.chapterTeacher', { points: chapter.teacherPoints })}
        </span>
      </div>
      <ReportPointsControl chapter={chapter} chapterName={name} />
    </li>
  );
}

/**
 * One pupil: the row with the two numbers, then a row with their chapters.
 *
 * @returns the pupil's two table rows
 */
function PupilRows({ pupil }: { pupil: TablePupil }) {
  const { t } = useClassPointsTranslation();
  return (
    <>
      <tr className="border-t border-border">
        <th scope="row" className="py-3 pr-3 text-left align-top font-semibold text-ink">
          <span className="[overflow-wrap:anywhere]">{pupil.displayName}</span>{' '}
          <span className="font-normal text-meta">@{pupil.handle}</span>
        </th>
        <td className="px-3 py-3 text-right align-top text-body">
          {pupil.classPoints === 0 ? t('table.noClassPoints') : pupil.classPoints}
        </td>
        <td className="py-3 pl-3 text-right align-top text-body">{pupil.teacherPoints}</td>
      </tr>
      <tr>
        <td colSpan={3} className="pb-4">
          {pupil.chapters.length === 0 ? (
            <p className="m-0 text-sm text-meta">{t('table.noChapters')}</p>
          ) : (
            <ul
              aria-label={`${t('table.columns.work')}: ${pupil.displayName}`}
              className="m-0 flex list-none flex-col rounded-card border border-border bg-panel px-4 py-1"
            >
              {pupil.chapters.map((chapter) => (
                <ChapterLine key={chapter.chapterId} chapter={chapter} />
              ))}
            </ul>
          )}
        </td>
      </tr>
    </>
  );
}

/**
 * Renders the table.
 *
 * @param props.pupils - the class's pupils, as class_points_table() answers them
 * @returns the table with its sortable headings
 */
export function ClassPointsTable({ pupils }: { pupils: TablePupil[] }) {
  const { t } = useClassPointsTranslation();
  const [sort, setSort] = useState<PupilSort>('name');
  return (
    <table className="w-full border-collapse text-[15px]">
      <caption className="sr-only">{t('table.caption')}</caption>
      <thead>
        <tr>
          {columns.map((column) => (
            <th
              key={column.sort}
              scope="col"
              aria-sort={ariaSortOf(column.sort, column.isNumber, sort)}
              className={cn('pb-2 align-bottom', column.isNumber ? 'text-right' : 'text-left')}
            >
              <button
                type="button"
                onClick={() => setSort(column.sort)}
                className={cn(
                  'min-h-6 rounded-sm text-sm font-semibold underline-offset-4 hover:underline',
                  sort === column.sort ? 'text-heading underline' : 'text-body',
                )}
              >
                {t(`table.columns.${column.labelKey}`)}
              </button>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sortedPupils(pupils, sort).map((pupil) => (
          <PupilRows key={pupil.handle} pupil={pupil} />
        ))}
      </tbody>
    </table>
  );
}
