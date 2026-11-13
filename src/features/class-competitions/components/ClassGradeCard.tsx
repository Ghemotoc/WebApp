/**
 * ClassGradeCard: the teacher says which school year their class is, in the class's settings
 * (bundle CLASS-POINTS, part 2; story S1-E8-15; Robert, 13 Nov 2026, decision 10: classes below
 * the 8th grade never have winners).
 *
 * What it shows: what the school year is for, the drop-down (1 to 13), "Save school year" and
 * the link to the teacher's criteria templates.
 * Who shows it: SpaceSettingsPage, for the teacher of a class space.
 * What it calls: useClassCompetitions → class_competitions(); useSetClassGrade →
 * set_class_grade(), which writes the change to the class's log.
 */
import { useState } from 'react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { Select } from '@/components/ui/Select';

import type { CompetitionFailure } from '../api/competitionErrors';
import { useClassCompetitions, useSetClassGrade } from '../hooks/useClassCompetitions';
import { useClassCompetitionsTranslation } from '../registerClassCompetitionsTranslations';

/** The school years a class can be. */
const grades = Array.from({ length: 13 }, (_unused, index) => String(index + 1));

/** What the drop-down and its button need. */
interface GradeFieldsProps {
  /** The saved school year as text, or empty until one is set. */
  saved: string;
  /** The school year now showing in the drop-down. */
  value: string;
  isRunning: boolean;
  onPick: (grade: string) => void;
  onSave: () => void;
}

/**
 * The school year drop-down and "Save school year".
 *
 * @returns the two controls
 */
function GradeFields({ saved, value, isRunning, onPick, onSave }: GradeFieldsProps) {
  const { t } = useClassCompetitionsTranslation();
  // "Not set" is a choice only until a school year is saved; a class never goes back to none.
  const unset = saved === '' ? [{ value: '', label: t('grade.notSet') }] : [];
  const years = grades.map((grade) => ({ value: grade, label: t('grade.option', { grade }) }));
  return (
    <div className="flex flex-wrap items-end gap-3">
      <Select
        id="class-grade"
        label={t('grade.label')}
        isLabelVisible
        placement="form"
        options={[...unset, ...years]}
        value={value}
        onChange={onPick}
      />
      <Button disabled={isRunning || value === '' || value === saved} onClick={onSave}>
        {t('grade.save')}
      </Button>
    </div>
  );
}

/**
 * What happened after "Save school year", read out politely.
 *
 * @param props.failure - why the database refused, or null
 * @param props.isSaved - true once the school year was saved
 * @returns the live region
 */
function GradeOutcome(props: { failure: CompetitionFailure | null; isSaved: boolean }) {
  const { t } = useClassCompetitionsTranslation();
  return (
    <div aria-live="polite">
      {props.failure !== null && <Notice tone="error">{t(`failures.${props.failure}`)}</Notice>}
      {props.isSaved && props.failure === null && (
        <Notice tone="success">{t('grade.saved')}</Notice>
      )}
    </div>
  );
}

/**
 * Renders the card.
 *
 * @param props.slug - the class's address
 * @returns the card, or nothing until the class's competitions have loaded or for anyone but
 *   the teacher
 */
export function ClassGradeCard({ slug }: { slug: string }) {
  const { t } = useClassCompetitionsTranslation();
  const competitions = useClassCompetitions(slug).data ?? null;
  const saver = useSetClassGrade(slug);
  const [picked, setPicked] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  if (competitions?.role !== 'teacher') return null;
  const saved = competitions.grade === null ? '' : String(competitions.grade);
  const value = picked ?? saved;

  /** Saves the school year, then says so. */
  async function save() {
    setIsSaved(false);
    const changed = await saver.save(Number(value)).catch(() => undefined);
    if (changed !== undefined) setIsSaved(true);
  }

  /** Keeps the choice and clears the old "saved" line. */
  function pick(grade: string) {
    setPicked(grade);
    setIsSaved(false);
  }

  return (
    <section
      aria-labelledby="class-grade-heading"
      className="flex w-full max-w-[760px] flex-col gap-3 rounded-[28px] border border-border bg-surface p-6"
    >
      <Eyebrow>{t('grade.eyebrow')}</Eyebrow>
      <h2 id="class-grade-heading" className="m-0 font-heading text-2xl font-bold text-heading">
        {t('grade.title')}
      </h2>
      <p className="m-0 text-body">{t('grade.intro')}</p>
      {competitions.isArchived ? (
        <p className="m-0 text-body">{t('grade.archived')}</p>
      ) : (
        <GradeFields
          saved={saved}
          value={value}
          isRunning={saver.isRunning}
          onPick={pick}
          onSave={save}
        />
      )}
      <Link
        to={`/spaces/${slug}/competition/templates`}
        className="w-fit font-semibold text-link underline"
      >
        {t('grade.templates')}
      </Link>
      <GradeOutcome failure={saver.failure?.failure ?? null} isSaved={isSaved} />
    </section>
  );
}
