/**
 * ClassPointsTable: the teacher's table of teacher points, class points and notes, pupil by
 * pupil (bundle CLASS-POINTS, part 1; story S1-E8-14 criterion 3; redrawn by BOOKS-8 part 8b,
 * board G09-ClassPoints, user story 8.9).
 *
 * What it shows: "Sort" (pen name A to Z, teacher points or class points; numbers largest
 * first), then one row per pupil: the pupil, teacher points, class points ("No class points yet"
 * under a 0), notes received and "Report points". Never a rank number or a medal, and nothing
 * says who gave points (Robert, 13 Nov 2026, decisions 2 and 8). Under the table, how it is
 * sorted and how many pupils show, and "Show 20 more" while some are hidden. The table scrolls
 * sideways inside its own region on phones, so the page never does (CLAUDE.md rule 21).
 * Who shows it: ClassPointsPage, for the class's teacher. What it calls: Select, sortedPupils.
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';

import type { TablePupil } from '../api/classPointsTable';
import { type PupilSort, sortedPupils } from '../lib/sortPupils';
import { useClassPointsTranslation } from '../registerClassPointsTranslations';

/** How many pupils show at first, and how many more each press shows. */
const pageSize = 20;

/** The sorts, in the drop-down's order. */
const sorts: PupilSort[] = ['name', 'teacher', 'class'];

/** The cell classes every row shares: 16 px across, 12 px down, a line above. */
const cellClasses = 'border-t border-border px-3 py-3 text-left align-top';

/**
 * One pupil's row.
 *
 * @param props.pupil - the pupil
 * @param props.onReport - opens the report form for them
 * @returns the table row
 */
function PupilRow({ pupil, onReport }: { pupil: TablePupil; onReport: () => void }) {
  const { t } = useClassPointsTranslation();
  const initial = pupil.displayName.slice(0, 1).toUpperCase();
  return (
    <tr>
      <th scope="row" className={`${cellClasses} font-normal`}>
        <span className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-tint type-meta font-semibold text-ink-heading"
          >
            {initial}
          </span>
          <span className="type-label text-ink-heading [overflow-wrap:anywhere]">
            {pupil.displayName}
          </span>
        </span>
      </th>
      <td className={cellClasses}>{pupil.teacherPoints}</td>
      <td className={cellClasses}>
        <span className="block">{pupil.classPoints}</span>
        {pupil.classPoints === 0 && (
          <span className="block type-meta">{t('table.noClassPoints')}</span>
        )}
      </td>
      <td className={cellClasses}>{pupil.notes}</td>
      <td className={cellClasses}>
        <Button
          variant="text"
          className="h-auto min-h-6"
          aria-label={t('pupils.reportButtonFor', { name: pupil.displayName })}
          onClick={onReport}
        >
          {t('pupils.reportButton')}
        </Button>
      </td>
    </tr>
  );
}

/**
 * The column headings.
 *
 * @returns the head row
 */
function HeadRow() {
  const { t } = useClassPointsTranslation();
  const columns = ['pupil', 'teacher', 'class', 'notes', 'odd'] as const;
  return (
    <tr>
      {columns.map((column) => (
        <th key={column} scope="col" className="px-3 pb-2 text-left type-meta font-semibold">
          {t(`pupils.columns.${column}`)}
        </th>
      ))}
    </tr>
  );
}

/**
 * Renders the sort, the table, the line under it and "Show 20 more".
 *
 * @param props.pupils - the class's pupils, as class_points_table() answers them
 * @param props.onReport - opens the report form for one pupil
 * @returns the section's parts
 */
export function ClassPointsTable(props: {
  pupils: TablePupil[];
  onReport: (pupil: TablePupil) => void;
}) {
  const { t } = useClassPointsTranslation();
  const [sort, setSort] = useState<PupilSort>('name');
  const [shownCount, setShownCount] = useState(pageSize);
  const shown = sortedPupils(props.pupils, sort).slice(0, shownCount);
  const hidden = props.pupils.length - shown.length;
  return (
    <div className="flex flex-col gap-3">
      <Select
        id="class-points-sort"
        label={t('pupils.sortLabel')}
        isLabelVisible
        isLabelStrong
        placement="form"
        options={sorts.map((value) => ({ value, label: t(`pupils.sort.${value}`) }))}
        value={sort}
        onChange={(value) => setSort(value as PupilSort)}
      />
      {/* The table scrolls inside its own region on a narrow screen (user story 8.9). */}
      <div
        role="region"
        aria-label={t('pupils.region')}
        tabIndex={0}
        className="max-w-full overflow-x-auto"
      >
        <table className="w-full min-w-[640px] border-collapse type-body">
          <caption className="sr-only">{t('pupils.region')}</caption>
          <thead>
            <HeadRow />
          </thead>
          <tbody>
            {shown.map((pupil) => (
              <PupilRow key={pupil.handle} pupil={pupil} onReport={() => props.onReport(pupil)} />
            ))}
          </tbody>
        </table>
      </div>
      <p className="m-0 type-meta">
        {t(`pupils.shown.${sort}`, { shown: shown.length, count: props.pupils.length })}
      </p>
      {hidden > 0 && (
        <Button variant="secondary" onClick={() => setShownCount(shownCount + pageSize)}>
          {t('pupils.showMore', { count: Math.min(hidden, pageSize) })}
        </Button>
      )}
    </div>
  );
}
