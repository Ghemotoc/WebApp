/**
 * CompetitionForm: the form for a new class competition, or one nobody entered yet (bundle
 * CLASS-POINTS, part 2; stories S1-E8-15 criteria 1 to 4 and S1-E8-19; redrawn by BOOKS-8 part
 * 8b, board G11-CompetitionNew, user story 8.11).
 *
 * What it shows: two columns from 1024 px, the form at 1.5 parts and "What pupils see"
 * (CompetitionPreview) at 1 part, 64 px apart; one column on tablets and phones. The form: the
 * name, Starts and Ends side by side (each a date and a time on the teacher's own clock,
 * CALM-7d), "Grading criteria" with the total as the teacher types, the templates, "How the
 * winner is picked", then "Open the competition" and Cancel. The button says what is missing in
 * words (a name, or a criterion with a name and one outcome) instead of being greyed out (DoD);
 * the database checks everything again, dates included.
 * Who shows it: CompetitionFormPage. What it calls: useSaveCompetition →
 * save_class_competition(), which writes the class's log; CriteriaEditor, the template tools,
 * CompetitionPreview.
 */
import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { Button } from '@/components/ui/Button';
import { buttonClassName } from '@/components/ui/buttonStyles';
import { ButtonRow } from '@/components/ui/ButtonRow';
import { Notice } from '@/components/ui/Notice';

import type { Criterion, RunningCompetition } from '../api/classCompetitions';
import { useSaveCompetition } from '../hooks/useClassCompetitions';
import { defaultMomentFields, momentOf, savedMomentFields } from '../lib/competitionDates';
import { copiedCriteria, emptyCriterion, maxTotal } from '../lib/criteriaDraft';
import { useClassCompetitionsTranslation } from '../registerClassCompetitionsTranslations';

import { CompetitionDetailsFields, type CompetitionDetails } from './CompetitionDetailsFields';
import { CompetitionPreview } from './CompetitionPreview';
import { CriteriaEditor } from './CriteriaEditor';
import { SaveAsTemplate, TemplatePicker } from './CriteriaTemplateTools';

/** What the form needs. */
export interface CompetitionFormProps {
  /** The class's address and name, and its teacher's name for the preview. */
  slug: string;
  className: string;
  teacherName: string;
  grade: number;
  areWinnersAllowed: boolean;
  /** The competition to change, or null for a new one. */
  current: RunningCompetition | null;
}

/**
 * What is missing before the competition can open, as locale keys (user story 8.11: "needs a
 * name, dates and at least one criterion with one outcome").
 *
 * @param details - the name and moments typed so far
 * @param criteria - the criteria typed so far
 * @returns the keys of what is missing, empty when nothing is
 */
function missingParts(details: CompetitionDetails, criteria: Criterion[]): string[] {
  const missing: string[] = [];
  if (details.name.trim() === '') missing.push('form.missingName');
  const hasOne = criteria.some(
    (criterion) =>
      criterion.label.trim() !== '' && criterion.outcomes.some((outcome) => outcome.trim() !== ''),
  );
  if (!hasOne) missing.push('form.missingCriterion');
  return missing;
}

/**
 * "How the winner is picked": the tinted box under the criteria (board G11).
 *
 * @returns the box
 */
function WinnerRules(props: { className: string; grade: number; areWinnersAllowed: boolean }) {
  const { t } = useClassCompetitionsTranslation();
  const gradeKey = props.areWinnersAllowed ? 'form.winnerGrade' : 'form.winnerGradeLow';
  return (
    <section
      aria-labelledby="winner-rules"
      className="flex flex-col gap-2 rounded-card bg-tint p-4"
    >
      <h3 id="winner-rules" className="m-0 type-label text-ink-heading">
        {t('form.winnerTitle')}
      </h3>
      <p className="m-0 max-w-[34em] type-body text-ink">
        {t('form.winnerBody')} {t(gradeKey, { name: props.className, grade: props.grade })}
      </p>
    </section>
  );
}

/**
 * The criteria part: heading with the live total, the templates and the editor.
 *
 * @returns the section
 */
function CriteriaSection(props: {
  slug: string;
  criteria: Criterion[];
  onChange: (criteria: Criterion[]) => void;
}) {
  const { t } = useClassCompetitionsTranslation();
  return (
    <section
      aria-labelledby="criteria-heading"
      className="flex flex-col gap-4 border-t border-border pt-8"
    >
      <div className="flex flex-col gap-1">
        <h2 id="criteria-heading" className="m-0 type-heading">
          {t('form.criteriaHeading')}
        </h2>
        <p className="m-0 type-meta" aria-live="polite">
          {t('form.criteriaIntro', { total: maxTotal(props.criteria) })}
        </p>
      </div>
      <TemplatePicker
        slug={props.slug}
        onUse={(template) => props.onChange(copiedCriteria(template.criteria))}
      />
      <CriteriaEditor idPrefix="competition" criteria={props.criteria} onChange={props.onChange} />
      <SaveAsTemplate criteria={props.criteria} />
    </section>
  );
}

/**
 * Under the form: what is missing or why the database refused, then "Open the competition" and
 * Cancel.
 *
 * @returns the live region and the buttons
 */
function FormFooter(props: {
  slug: string;
  missing: string[];
  failure: string | null;
  isRunning: boolean;
  isNew: boolean;
}) {
  const { t } = useClassCompetitionsTranslation();
  return (
    <>
      <div aria-live="polite">
        {props.missing.length > 0 && (
          <Notice tone="error">{props.missing.map((key) => t(key)).join(' ')}</Notice>
        )}
        {props.failure !== null && <Notice tone="error">{t(`failures.${props.failure}`)}</Notice>}
      </div>
      <ButtonRow>
        <Button type="submit" disabled={props.isRunning}>
          {t(props.isNew ? 'form.submitNew' : 'form.submitEdit')}
        </Button>
        <Link to={`/spaces/${props.slug}`} className={buttonClassName({ variant: 'text' })}>
          {t('form.cancel')}
        </Link>
      </ButtonRow>
    </>
  );
}

/**
 * Renders the form and the preview.
 *
 * @returns the two columns
 */
export function CompetitionForm(props: CompetitionFormProps) {
  const { slug, current } = props;
  const navigate = useNavigate();
  const saver = useSaveCompetition();
  const [details, setDetails] = useState<CompetitionDetails>(() =>
    current === null
      ? { name: '', ...defaultMomentFields(new Date()) }
      : { name: current.name, ...savedMomentFields(current.startsAt, current.endsAt) },
  );
  const [criteria, setCriteria] = useState<Criterion[]>(() =>
    current === null ? [emptyCriterion()] : current.criteria,
  );
  const [wasSent, setWasSent] = useState(false);
  const missing = wasSent ? missingParts(details, criteria) : [];

  /** Says what is missing, or saves the competition and goes back to the class page. */
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWasSent(true);
    if (missingParts(details, criteria).length > 0) return;
    // A date and time that isn't real goes as null; the database answers competition:dates.
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
    <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-16">
      <form noValidate onSubmit={save} className="flex min-w-0 flex-col gap-8">
        <CompetitionDetailsFields details={details} onChange={setDetails} />
        <CriteriaSection slug={slug} criteria={criteria} onChange={setCriteria} />
        <WinnerRules
          className={props.className}
          grade={props.grade}
          areWinnersAllowed={props.areWinnersAllowed}
        />
        <FormFooter
          slug={slug}
          missing={missing}
          failure={saver.failure?.failure ?? null}
          isRunning={saver.isRunning}
          isNew={current === null}
        />
      </form>
      <CompetitionPreview
        name={details.name}
        startsAt={momentOf(details.starts)}
        endsAt={momentOf(details.ends)}
        criteria={criteria}
        teacherName={props.teacherName}
        areWinnersAllowed={props.areWinnersAllowed}
      />
    </div>
  );
}
