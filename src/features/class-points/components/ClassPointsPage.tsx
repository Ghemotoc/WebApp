/**
 * ClassPointsPage: /spaces/<slug>/points, the teacher's class points (bundle CLASS-POINTS, part
 * 1; story S1-E8-14 criterion 3; redrawn by BOOKS-8 part 8b, board G09-ClassPoints, user story
 * 8.9).
 *
 * What it shows: "Class points" and its line (only the teacher sees the page; who gave class
 * points stays private, even from them), the class's sections, the table (ClassPointsTable),
 * the report form for one pupil once "Report points" is pressed (PupilPointsReport), and
 * Settings (ClassPointsSettingsSection). While points are off the table says so and Settings
 * holds the switch. Anyone but the class's teacher is told the page is the teacher's. No ads.
 * Who shows it: the router. What it calls: useSpace → space_page() for the name and who is
 * looking; useClassPointsTable → class_points_table(), which answers only the teacher.
 */
import { useState } from 'react';
import { useParams } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import type { Space } from '@/features/spaces/api/spaces';
import { ClassSectionTabs } from '@/features/spaces/components/ClassSectionTabs';
import { SpaceBreadcrumb } from '@/features/spaces/components/SpaceBreadcrumb';
import { useSpace } from '@/features/spaces/hooks/useSpaces';

import type { TablePupil } from '../api/classPointsTable';
import { useClassPointsTable } from '../hooks/useClassPoints';
import { useClassPointsTranslation } from '../registerClassPointsTranslations';

import { ClassPointsSettingsSection } from './ClassPointsSettingsSection';
import { ClassPointsTable } from './ClassPointsTable';
import { PupilPointsReport } from './PupilPointsReport';

/**
 * The table and, once a pupil's "Report points" was pressed, the form under it. While points
 * are off, a line saying so; with no pupils, a line saying that.
 *
 * @param props.slug - the class's address
 * @returns the table part of the page
 */
function TeacherTable({ slug }: { slug: string }) {
  const { t } = useClassPointsTranslation();
  const read = useClassPointsTable(slug);
  const [reporting, setReporting] = useState<TablePupil | null>(null);
  if (read.isError) return <Notice tone="error">{t('table.loadFailed')}</Notice>;
  if (read.data === undefined) return null;
  // The database answers nothing while class points are off; the switch is in Settings below.
  if (read.data === null) return <p className="m-0 type-body text-ink-muted">{t('week.off')}</p>;
  if (read.data.length === 0) return <p className="m-0 text-ink-muted">{t('table.empty')}</p>;
  return (
    <>
      <ClassPointsTable pupils={read.data} onReport={setReporting} />
      {reporting !== null && (
        <PupilPointsReport
          key={reporting.handle}
          slug={slug}
          pupil={reporting}
          onClose={() => setReporting(null)}
        />
      )}
    </>
  );
}

/**
 * What goes under the heading: nothing while loading, a note for anyone but the teacher, or the
 * teacher's sections, table and settings.
 *
 * @param props.space - the class, or null or undefined while unknown
 * @returns the body
 */
function ClassPointsBody({ space }: { space: Space | null | undefined }) {
  const { t } = useClassPointsTranslation();
  if (space === undefined || space === null) return null;
  if (space.kind !== 'class' || space.viewer.membership !== 'owner') {
    return <p className="m-0 text-ink-muted">{t('table.teacherOnly')}</p>;
  }
  return (
    <>
      <ClassSectionTabs slug={space.slug} isTeacher />
      <TeacherTable slug={space.slug} />
      <ClassPointsSettingsSection slug={space.slug} />
    </>
  );
}

/**
 * Renders the page.
 *
 * @returns the screen
 */
export function ClassPointsPage() {
  const { t } = useClassPointsTranslation();
  const { spaceSlug = '' } = useParams();
  const space = useSpace(spaceSlug);
  const name = space.data?.name ?? '';
  return (
    <PageContainer className="flex flex-col gap-12 py-8">
      <title>{t('table.documentTitle', { name })}</title>
      <SpaceBreadcrumb space={{ slug: spaceSlug, name }} current={t('table.title')} />
      <header className="flex flex-col gap-2">
        <h1 className="page-title">{t('table.title')}</h1>
        <p className="m-0 max-w-[34em] type-body text-ink-muted">{t('pupils.intro')}</p>
      </header>
      <ClassPointsBody space={space.data} />
    </PageContainer>
  );
}
