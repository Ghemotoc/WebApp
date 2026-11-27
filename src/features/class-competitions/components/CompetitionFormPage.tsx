/**
 * CompetitionFormPage: /spaces/<slug>/competition, where the teacher starts a class competition
 * or changes one nobody entered yet (bundle CLASS-POINTS, part 2; stories S1-E8-15 criteria 1 to
 * 4 and S1-E8-19; laid out as board G11-CompetitionNew by BOOKS-8 part 8b, user story 8.11).
 *
 * What it shows: the breadcrumb, "New class competition" (or "Change the competition") and the
 * form with its preview (CompetitionForm). While another competition runs and pupils have entered
 * it, the page says one is already running, names it and links to the class, instead of a
 * greyed-out button on the class page (user story 8.11). Anyone but the class's teacher is told
 * the page is the teacher's. Plain page, no doodles, no ads.
 * Who shows it: the router. What it calls: useSpace → space_page(); useClassCompetitions →
 * class_competitions(); CompetitionForm.
 */
import { Link, useParams } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { nameOf } from '@/features/forums/lib/forumPeople';
import type { Space } from '@/features/spaces/api/spaces';
import { SpaceBreadcrumb } from '@/features/spaces/components/SpaceBreadcrumb';
import { useSpace } from '@/features/spaces/hooks/useSpaces';

import { useClassCompetitions } from '../hooks/useClassCompetitions';
import { useClassCompetitionsTranslation } from '../registerClassCompetitionsTranslations';

import { CompetitionForm } from './CompetitionForm';

/**
 * Why there is no form: a competition is running and pupils entered it (one runs at a time, user
 * story 8.11), or the class has no school year yet.
 *
 * @param props.slug - the class's address
 * @param props.runningName - the running competition's name, or null when the grade is missing
 * @returns the note and the link to the class
 */
function NoFormNote({ slug, runningName }: { slug: string; runningName: string | null }) {
  const { t } = useClassCompetitionsTranslation();
  const note =
    runningName === null ? t('card.needsGrade') : t('form.running', { name: runningName });
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="m-0 max-w-[34em] type-body text-ink-muted">{note}</p>
      <Link to={`/spaces/${slug}`} className="font-semibold text-link underline">
        {t(runningName === null ? 'form.backToClass' : 'form.seeRunning')}
      </Link>
    </div>
  );
}

/**
 * The teacher's part of the page: a note while the class has no school year or the competition
 * can no longer change, or the form.
 *
 * @param props.slug - the class's address
 * @returns the note or the form
 */
function TeacherForm({ space }: { space: Space }) {
  const { t } = useClassCompetitionsTranslation();
  const slug = space.slug;
  const read = useClassCompetitions(slug);
  if (read.isError) return <Notice tone="error">{t('card.loadFailed')}</Notice>;
  const competitions = read.data ?? null;
  if (competitions === null) return null;
  const running = competitions.running;
  const isLocked = running !== null && !running.canEdit;
  if (competitions.grade === null || isLocked) {
    return <NoFormNote slug={slug} runningName={isLocked ? running.name : null} />;
  }
  // The key rebuilds the form when the competition it edits changes.
  return (
    <CompetitionForm
      key={running?.id ?? 'new'}
      slug={slug}
      className={space.name}
      teacherName={nameOf(space.owner, '')}
      grade={competitions.grade}
      areWinnersAllowed={competitions.areWinnersAllowed}
      current={running}
    />
  );
}

/**
 * What goes under the heading: nothing while loading, a note for anyone but the teacher, or the
 * teacher's part.
 *
 * @param props.space - the class, or null or undefined while unknown
 * @returns the body
 */
function FormBody({ space }: { space: Space | null | undefined }) {
  const { t } = useClassCompetitionsTranslation();
  if (space === undefined || space === null) return null;
  if (space.kind !== 'class' || space.viewer.membership !== 'owner') {
    return <p className="m-0 text-ink-muted">{t('form.teacherOnly')}</p>;
  }
  return <TeacherForm space={space} />;
}

/**
 * Renders the page.
 *
 * @returns the screen
 */
export function CompetitionFormPage() {
  const { t } = useClassCompetitionsTranslation();
  const { spaceSlug = '' } = useParams();
  const space = useSpace(spaceSlug);
  const running = useClassCompetitions(spaceSlug).data?.running ?? null;
  const name = space.data?.name ?? '';
  const title = t(running === null ? 'form.titleNew' : 'form.titleEdit');
  return (
    <PageContainer className="flex flex-col gap-12 py-8">
      <title>{t('form.documentTitle', { name })}</title>
      <SpaceBreadcrumb space={{ slug: spaceSlug, name }} current={title} />
      <header className="flex flex-col gap-2">
        <h1 className="page-title">{title}</h1>
      </header>
      <FormBody space={space.data} />
    </PageContainer>
  );
}
