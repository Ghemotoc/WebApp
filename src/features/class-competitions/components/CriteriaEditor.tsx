/**
 * CriteriaEditor: the teacher writes a set of grading criteria (bundle CLASS-POINTS, part 2;
 * stories S1-E8-15 criterion 2 and S1-E8-19; Robert, 13 Nov 2026, 19:20 UTC: each criterion has
 * a label, a maximum, a description and its learning outcomes as bullet points, as at school).
 *
 * What it shows (board G11-CompetitionNew, BOOKS-8 part 8b): one criterion open at a time in a
 * tinted box ("Criterion 1" with "Remove criterion"; name, most points, description and 1 to 8
 * outcome lines, each with a remove cross, and "Add an outcome"); every other criterion as one
 * row, "Criterion 2: Imagination", "10 points · 3 learning outcomes" and Edit; then "Add a
 * criterion" up to six. Plain text only; the database refuses HTML.
 * Who shows it: CompetitionFormPage and CriteriaTemplatesPage. What it calls: nothing; the
 * parent holds the list and gets every change.
 */
import { useState } from 'react';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { CrossIcon } from '@/components/icons/CrossIcon';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';

import type { Criterion } from '../api/classCompetitions';
import {
  criteriaLimits,
  emptyCriterion,
  pointsFromTyped,
  withCriterion,
  withOutcome,
  withoutCriterion,
  withoutOutcome,
} from '../lib/criteriaDraft';
import { useClassCompetitionsTranslation } from '../registerClassCompetitionsTranslations';

/** What the editor needs. */
export interface CriteriaEditorProps {
  /** A prefix for field ids, so two editors never share an id. */
  idPrefix: string;
  criteria: Criterion[];
  onChange: (criteria: Criterion[]) => void;
}

/** What one criterion's fields need. */
interface CriterionFieldsProps {
  fieldId: string;
  /** The criterion's place in the list, from 1. */
  number: number;
  criterion: Criterion;
  canRemove: boolean;
  onChange: (criterion: Criterion) => void;
  onRemove: () => void;
}

/**
 * The outcome lines of one criterion: a bullet, the line and a remove cross each.
 *
 * @returns the lines and "Add an outcome"
 */
function OutcomeFields({ fieldId, number, criterion, onChange }: CriterionFieldsProps) {
  const { t } = useClassCompetitionsTranslation();
  const hintId = `${fieldId}-outcomes-hint`;
  return (
    <fieldset className="m-0 flex flex-col gap-2 border-0 p-0" aria-describedby={hintId}>
      <legend className="mb-2 p-0 type-body font-semibold text-ink">
        {t('form.outcomesLegend')}
      </legend>
      {criterion.outcomes.map((outcome, index) => (
        <div key={index} className="flex items-center gap-2">
          <span aria-hidden="true" className="w-3 shrink-0 text-center text-ink">
            •
          </span>
          <div className="min-w-0 flex-1">
            <TextInput
              id={`${fieldId}-outcome-${index}`}
              label={t('form.outcome', { number: index + 1, criterion: number })}
              isLabelHidden
              maxLength={criteriaLimits.outcomeLength}
              value={outcome}
              onChange={(event) => onChange(withOutcome(criterion, index, event.target.value))}
            />
          </div>
          {criterion.outcomes.length > 1 && (
            <button
              type="button"
              aria-label={t('form.removeOutcome', { number: index + 1, criterion: number })}
              onClick={() => onChange(withoutOutcome(criterion, index))}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink hover:bg-tint"
            >
              <CrossIcon size={18} />
            </button>
          )}
        </div>
      ))}
      {criterion.outcomes.length < criteriaLimits.maxOutcomes && (
        <Button
          variant="text"
          className="w-fit"
          onClick={() => onChange({ ...criterion, outcomes: [...criterion.outcomes, ''] })}
        >
          <ActionIcon name="plus" />
          {t('form.addOutcome')}
        </Button>
      )}
      <p id={hintId} className="m-0 type-meta">
        {t('form.outcomesHint')}
      </p>
    </fieldset>
  );
}

/**
 * The name, the most points and the description of one criterion.
 *
 * @returns the three fields
 */
function CriterionTexts({ fieldId, criterion, onChange }: CriterionFieldsProps) {
  const { t } = useClassCompetitionsTranslation();
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_120px]">
        <TextInput
          id={`${fieldId}-label`}
          label={t('form.label')}
          maxLength={criteriaLimits.labelLength}
          value={criterion.label}
          onChange={(event) => onChange({ ...criterion, label: event.target.value })}
        />
        <TextInput
          id={`${fieldId}-points`}
          label={t('form.maxPoints')}
          inputMode="numeric"
          value={criterion.maxPoints === 0 ? '' : String(criterion.maxPoints)}
          onChange={(event) =>
            onChange({ ...criterion, maxPoints: pointsFromTyped(event.target.value) })
          }
        />
      </div>
      <div className="max-w-[480px]">
        <TextInput
          id={`${fieldId}-description`}
          label={t('form.description')}
          hint={t('form.descriptionHint')}
          maxLength={criteriaLimits.descriptionLength}
          value={criterion.description}
          onChange={(event) => onChange({ ...criterion, description: event.target.value })}
        />
      </div>
    </>
  );
}

/**
 * The open criterion, in its tinted box.
 *
 * @returns the group: heading with "Remove criterion", the fields and the outcomes
 */
function CriterionFields(props: CriterionFieldsProps) {
  const { number, canRemove, onRemove } = props;
  const { t } = useClassCompetitionsTranslation();
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-4 rounded-card border-0 bg-surface-solid p-6">
      <legend className="sr-only">{t('form.criterion', { number })}</legend>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span aria-hidden="true" className="type-label text-ink-heading">
          {t('form.criterion', { number })}
        </span>
        {canRemove && (
          <Button
            variant="text"
            aria-label={t('form.removeCriterion', { number })}
            onClick={onRemove}
          >
            {t('form.removeCriterionShort')}
          </Button>
        )}
      </div>
      <CriterionTexts {...props} />
      <OutcomeFields {...props} />
    </fieldset>
  );
}

/**
 * A closed criterion: its number and name, its points and outcomes, and Edit.
 *
 * @returns the row
 */
function CriterionRow(props: { number: number; criterion: Criterion; onOpen: () => void }) {
  const { t } = useClassCompetitionsTranslation();
  const { number, criterion } = props;
  const outcomes = criterion.outcomes.filter((outcome) => outcome.trim() !== '').length;
  return (
    <div className="flex items-center justify-between gap-4 border-t border-border py-3">
      <div className="flex min-w-0 flex-col">
        <span className="type-label text-ink-heading [overflow-wrap:anywhere]">
          {t('form.criterionSummary', { number, label: criterion.label })}
        </span>
        <span className="type-meta">
          {t('form.criterionPoints', { count: criterion.maxPoints })} ·{' '}
          {t('form.criterionOutcomes', { count: outcomes })}
        </span>
      </div>
      <Button
        variant="text"
        aria-label={t('form.editCriterion', { number })}
        onClick={props.onOpen}
      >
        {t('form.edit')}
      </Button>
    </div>
  );
}

/**
 * Renders the editor.
 *
 * @returns the open criterion, the others as rows, and "Add a criterion"
 */
export function CriteriaEditor({ idPrefix, criteria, onChange }: CriteriaEditorProps) {
  const { t } = useClassCompetitionsTranslation();
  // Step 1: one criterion is open at a time; the first to start with.
  const [openIndex, setOpenIndex] = useState(0);

  /** Takes a criterion away and keeps a sensible one open. */
  function remove(index: number) {
    onChange(withoutCriterion(criteria, index));
    setOpenIndex(Math.max(0, Math.min(openIndex, criteria.length - 2)));
  }

  /** Adds an empty criterion and opens it. */
  function add() {
    onChange([...criteria, emptyCriterion()]);
    setOpenIndex(criteria.length);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col">
        {criteria.map((criterion, index) =>
          index === openIndex ? (
            <CriterionFields
              key={index}
              fieldId={`${idPrefix}-criterion-${index}`}
              number={index + 1}
              criterion={criterion}
              canRemove={criteria.length > 1}
              onChange={(next) => onChange(withCriterion(criteria, index, next))}
              onRemove={() => remove(index)}
            />
          ) : (
            <CriterionRow
              key={index}
              number={index + 1}
              criterion={criterion}
              onOpen={() => setOpenIndex(index)}
            />
          ),
        )}
      </div>
      {criteria.length < criteriaLimits.maxCriteria && (
        <Button variant="secondary" className="w-full" onClick={add}>
          <ActionIcon name="plus" />
          {t('form.addCriterion')}
        </Button>
      )}
    </div>
  );
}
