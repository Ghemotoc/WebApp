/**
 * CompetitionFormPage: /spaces/<slug>/competition, where the teacher starts a class competition
 * or changes one nobody joined yet (bundle CLASS-POINTS, part 2; stories S1-E8-15 criteria 1 to
 * 4 and S1-E8-19).
 *
 * What it shows: the name, the first and last day, the criteria editor, the teacher's templates
 * ("Use template" above the criteria, "Save as template" under them) and "Start the
 * competition". Anyone but the class's teacher is told the page is the teacher's; a competition
 * pupils already joined is locked. Plain page, no doodles, no ads.
 * Who shows it: the router. What it calls: useSpace → space_page(); useClassCompetitions →
 * class_competitions(); useSaveCompetition → save_class_competition(), which checks everything
 * again and writes the class's log.
 */
import { type FormEvent, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { TextInput } from '@/components/ui/TextInput';
import type { Space } from '@/features/spaces/api/spaces';
import { SpaceBreadcrumb } from '@/features/spaces/components/SpaceBreadcrumb';
import { useSpace } from '@/features/spaces/hooks/useSpaces';

import type { Criterion, RunningCompetition } from '../api/classCompetitions';
import { useClassCompetitions, useSaveCompetition } from '../hooks/useClassCompetitions';
import { defaultDates } from '../lib/competitionDates';
import { copiedCriteria, emptyCriterion } from '../lib/criteriaDraft';
import { useClassCompetitionsTranslation } from '../registerClassCompetitionsTranslations';

import { CriteriaEditor } from './CriteriaEditor';
import { SaveAsTemplate, TemplatePicker } from './CriteriaTemplateTools';

/** The name and the two days, as the form holds them. */
interface Details {
  name: string;
  startsOn: string;
  endsOn: string;
}

/**
 * The name and the two date fields.
 *
 * @param props.details - what is typed so far
 * @param props.onChange - takes the changed details
 * @returns the three fields
 */
function DetailsFields(props: { details: Details; onChange: (details: Details) => void }) {
  const { details, onChange } = props;
  const { t } = useClassCompetitionsTranslation();
  return (
    <div className="flex flex-col gap-4">
      <TextInput
        id="competition-name"
        label={t('form.name')}
        hint={t('form.nameHint')}
        maxLength={120}
        required
        value={details.name}
        onChange={(event) => onChange({ ...details, name: event.target.value })}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput
          id="competition-starts"
          type="date"
          label={t('form.startsOn')}
          required
          value={details.startsOn}
          onChange={(event) => onChange({ ...details, startsOn: event.target.value })}
        />
        <TextInput
          id="competition-ends"
          type="date"
          label={t('form.endsOn')}
          hint={t('form.datesHint')}
          required
          value={details.endsOn}
          onChange={(event) => onChange({ ...details, endsOn: event.target.value })}
        />
      </div>
    </div>
  );
}

/**
 * A headed part of the form.
 *
 * @param props.heading - the part's heading
 * @param props.intro - one line under it, when there is one
 * @returns the section
 */
function FormSection(props: { heading: string; intro?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="m-0 font-heading text-2xl font-bold text-heading">{props.heading}</h2>
      {props.intro !== undefined && <p className="m-0 text-body">{props.intro}</p>}
      {props.children}
    </section>
  );
}

/** What the form needs. */
interface CompetitionFormProps {
  /** The class's address. */
  slug: string;
  /** The competition to change, or null for a new one. */
  current: RunningCompetition | null;
  /** Today as the database counts it, for a new competition's first day. */
  today: string;
}

/**
 * The form itself, for a new competition or one that can still change.
 *
 * @returns the form
 */
function CompetitionForm({ slug, current, today }: CompetitionFormProps) {
  const { t } = useClassCompetitionsTranslation();
  const navigate = useNavigate();
  const saver = useSaveCompetition();
  const [details, setDetails] = useState<Details>(() =>
    current === null
      ? { name: '', ...defaultDates(today) }
      : { name: current.name, startsOn: current.startsOn, endsOn: current.endsOn },
  );
  const [criteria, setCriteria] = useState<Criterion[]>(() =>
    current === null ? [emptyCriterion()] : current.criteria,
  );

  /** Saves the competition, then goes back to the class page, where its card now shows. */
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const request = { slug, competitionId: current?.id ?? null, ...details, criteria };
    const saved = await saver.save(request).catch(() => undefined);
    if (saved !== undefined) await navigate(`/spaces/${slug}`);
  }

  return (
    <form
      onSubmit={save}
      className="flex flex-col gap-8 rounded-card border border-border bg-surface p-5 shadow-card md:p-6"
    >
      <DetailsFields details={details} onChange={setDetails} />
      <FormSection heading={t('form.templateHeading')}>
        <TemplatePicker
          slug={slug}
          onUse={(template) => setCriteria(copiedCriteria(template.criteria))}
        />
      </FormSection>
      <FormSection heading={t('form.criteriaHeading')} intro={t('form.criteriaIntro')}>
        <CriteriaEditor idPrefix="competition" criteria={criteria} onChange={setCriteria} />
        <SaveAsTemplate criteria={criteria} />
      </FormSection>
      <div aria-live="polite">
        {saver.failure !== null && (
          <Notice tone="error">{t(`failures.${saver.failure.failure}`)}</Notice>
        )}
      </div>
      <Button type="submit" className="w-fit" disabled={saver.isRunning}>
        {t(current === null ? 'form.submitNew' : 'form.submitEdit')}
      </Button>
    </form>
  );
}

/**
 * The teacher's part of the page: a note while the class has no school year or the competition
 * can no longer change, or the form.
 *
 * @param props.slug - the class's address
 * @returns the note or the form
 */
function TeacherForm({ slug }: { slug: string }) {
  const { t } = useClassCompetitionsTranslation();
  const read = useClassCompetitions(slug);
  if (read.isError) return <Notice tone="error">{t('card.loadFailed')}</Notice>;
  const competitions = read.data ?? null;
  if (competitions === null) return null;
  const running = competitions.running;
  const isLocked = running !== null && !running.canEdit;
  if (competitions.grade === null || isLocked) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="m-0 text-body">{t(isLocked ? 'form.locked' : 'card.needsGrade')}</p>
        <Link to={`/spaces/${slug}`} className="font-semibold text-link underline">
          {t('form.backToClass')}
        </Link>
      </div>
    );
  }
  // The key rebuilds the form when the competition it edits changes.
  return (
    <CompetitionForm
      key={running?.id ?? 'new'}
      slug={slug}
      current={running}
      today={competitions.today}
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
    return <p className="m-0 text-body">{t('form.teacherOnly')}</p>;
  }
  return <TeacherForm slug={space.slug} />;
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
    <PageContainer className="flex max-w-[860px] flex-col gap-6 py-10">
      <title>{t('form.documentTitle', { name })}</title>
      <SpaceBreadcrumb space={{ slug: spaceSlug, name }} current={title} />
      <header className="flex flex-col gap-2">
        <Eyebrow>{name}</Eyebrow>
        <h1 className="m-0 font-heading text-[clamp(32px,4vw,48px)] leading-[1.05] font-extrabold text-heading">
          {title}
        </h1>
        <p className="m-0 max-w-[640px] text-body">{t('form.intro')}</p>
      </header>
      <FormBody space={space.data} />
    </PageContainer>
  );
}
