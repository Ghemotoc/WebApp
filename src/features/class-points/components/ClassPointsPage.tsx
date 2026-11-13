/**
 * ClassPointsPage: /spaces/<slug>/points, the teacher's class points table (bundle CLASS-POINTS,
 * part 1; story S1-E8-14 criterion 3).
 *
 * What it shows: the class's name, what the table is (no ranking, no givers) and the table
 * (ClassPointsTable). Anyone but the class's teacher is told the page is the teacher's; while
 * points are off it says so and links to the class settings. Plain page, no doodles, no ads.
 * Who shows it: the router. What it calls: useSpace → space_page() for the name and who is
 * looking; useClassPointsTable → class_points_table(), which answers only the teacher.
 */
import { Link, useParams } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import type { Space } from '@/features/spaces/api/spaces';
import { SpaceBreadcrumb } from '@/features/spaces/components/SpaceBreadcrumb';
import { useSpace } from '@/features/spaces/hooks/useSpaces';

import { useClassPointsTable } from '../hooks/useClassPoints';
import { useClassPointsTranslation } from '../registerClassPointsTranslations';

import { ClassPointsTable } from './ClassPointsTable';

/**
 * What goes under the heading: nothing while loading, a note for anyone but the teacher, or the
 * teacher's table.
 *
 * @param props.space - the class, or null or undefined while unknown
 * @returns the body
 */
function ClassPointsBody({ space }: { space: Space | null | undefined }) {
  const { t } = useClassPointsTranslation();
  if (space === undefined || space === null) return null;
  if (space.kind !== 'class' || space.viewer.membership !== 'owner') {
    return <p className="m-0 text-body">{t('table.teacherOnly')}</p>;
  }
  return <TeacherTable slug={space.slug} />;
}

/**
 * The teacher's table, a note while points are off, or a note for a class with no pupils.
 *
 * @param props.slug - the class's address
 * @returns the table or a note
 */
function TeacherTable({ slug }: { slug: string }) {
  const { t } = useClassPointsTranslation();
  const read = useClassPointsTable(slug);
  if (read.isError) return <Notice tone="error">{t('table.loadFailed')}</Notice>;
  if (read.data === undefined) return null;
  // The database answers nothing while class points are off.
  if (read.data === null) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="m-0 text-body">{t('table.off')}</p>
        <Link to={`/spaces/${slug}/settings`} className="font-semibold text-link underline">
          {t('table.openSettings')}
        </Link>
      </div>
    );
  }
  if (read.data.length === 0) return <p className="m-0 text-body">{t('table.empty')}</p>;
  return (
    <div className="rounded-card border border-border bg-surface p-5 shadow-card md:p-6">
      <ClassPointsTable pupils={read.data} />
    </div>
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
    <PageContainer className="flex max-w-[860px] flex-col gap-6 py-10">
      <title>{t('table.documentTitle', { name })}</title>
      <SpaceBreadcrumb space={{ slug: spaceSlug, name }} current={t('table.title')} />
      <header className="flex flex-col gap-2">
        <Eyebrow>{name}</Eyebrow>
        <h1 className="m-0 font-heading text-[clamp(32px,4vw,48px)] leading-[1.05] font-extrabold text-heading">
          {t('table.title')}
        </h1>
        <p className="m-0 max-w-[640px] text-body">{t('table.intro')}</p>
      </header>
      <ClassPointsBody space={space.data} />
    </PageContainer>
  );
}
