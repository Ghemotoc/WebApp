/**
 * CompetitionFormPage: /spaces/<slug>/competition, where the teacher starts a class competition
 * or changes one nobody joined yet (bundle CLASS-POINTS, part 2; stories S1-E8-15 criteria 1 to
 * 4 and S1-E8-19).
 *
 * What it shows: the name, the start and the end (each a date and a time on the teacher's own
 * clock in the shared DateTimeField, CALM-7d), the criteria editor, the teacher's templates
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
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { TextInput } from '@/components/ui/TextInput';
import type { Space } from '@/features/spaces/api/spaces';
import { SpaceBreadcrumb } from '@/features/spaces/components/SpaceBreadcrumb';
import { useSpace } from '@/features/spaces/hooks/useSpaces';
import { deviceTimeZone } from '@/lib/local-time';

import type { Criterion, RunningCompetition } from '../api/classCompetitions';
import { useClassCompetitions, useSaveCompetition } from '../hooks/useClassCompetitions';
import {
  defaultMomentFields,
  momentOf,
  savedMomentFields,
  type CompetitionMomentFields,
} from '../lib/competitionDates';
import { copiedCriteria, emptyCriterion } from '../lib/criteriaDraft';
import { useClassCompetitionsTranslation } from '../registerClassCompetitionsTranslations';

import { CriteriaEditor } from './CriteriaEditor';
import { SaveAsTemplate, TemplatePicker } from './CriteriaTemplateTools';

/** The name and the two moments' fields, as the form holds them. */
interface Details extends CompetitionMomentFields {
  name: string;
}

/**
 * The name and the start and end fields.
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
      <DateTimeField
        id="competition-starts"
        value={details.starts}
        onChange={(starts) => onChange({ ...details, starts })}
        dateLabel={t('form.startsOn')}
        timeLabel={t('form.startTime')}
        skippedHourNote={(time) => t('form.skippedHourNote', { time })}
      />
      <DateTimeField
        id="competition-ends"
        value={details.ends}
        onChange={(ends) => onChange({ ...details, ends })}
        dateLabel={t('form.endsOn')}
        timeLabel={t('form.endTime')}
        note={t('form.datesHint', { zone: deviceTimeZone() })}
        skippedHourNote={(time) => t('form.skippedHourNote', { time })}
      />
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
}

/**
 * The form itself, for a new competition or one that can still change.
 *
 * @returns the form
 */
function CompetitionForm({ slug, current }: CompetitionFormProps) {
  const { t } = useClassCompetitionsTranslation();
  const navigate = useNavigate();
  const saver = useSaveCompetition();
  const [details, setDetails] = useState<Details>(() =>
    current === null
      ? { name: '', ...defaultMomentFields(new Date()) }
      : { name: current.name, ...savedMomentFields(current.startsAt, current.endsAt) },
  );
  const [criteria, setCriteria] = useState<Criterion[]>(() =>
    current === null ? [emptyCriterion()] : current.criteria,
  );

  /** Saves the competition, then goes back to the class page, where its card now shows. */
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // The typed dates and times become moments; one that isn't real goes as null and the
    // database answers competition:dates, which the form shows.
    const request = {
      slug,
      competitionId: current?.id ?? null,
      name: details.name,
      startsAt: momentOf(details.starts),
      endsAt: momentOf(details.ends),
      criteria,
    };
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
  return <CompetitionForm key={running?.id ?? 'new'} slug={slug} current={running} />;
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
        <h1 className="m-0 type-title break-words lg:type-display">{title}</h1>
        <p className="m-0 max-w-[640px] text-meta">{t('form.intro')}</p>
      </header>
      <FormBody space={space.data} />
    </PageContainer>
  );
}
