/**
 * CriteriaEditor: the teacher writes a set of grading criteria (bundle CLASS-POINTS, part 2;
 * stories S1-E8-15 criterion 2 and S1-E8-19; Robert, 13 Nov 2026, 19:20 UTC: each criterion has
 * a label, a maximum, a description and its learning outcomes as bullet points, as at school).
 *
 * What it shows: one group of fields per criterion (label, maximum points, description, 1 to 8
 * outcome lines with "Add an outcome" and a remove button each), "Remove criterion" and "Add a
 * criterion" up to six. Plain text only; the database refuses HTML.
 * Who shows it: CompetitionFormPage and CriteriaTemplatesPage. What it calls: nothing; the
 * parent holds the list and gets every change.
 */
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
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
 * The outcome lines of one criterion.
 *
 * @returns the lines, each with its remove button, and "Add an outcome"
 */
function OutcomeFields({ fieldId, number, criterion, onChange }: CriterionFieldsProps) {
  const { t } = useClassCompetitionsTranslation();
  const hintId = `${fieldId}-outcomes-hint`;
  return (
    <fieldset className="m-0 flex flex-col gap-2 border-0 p-0" aria-describedby={hintId}>
      <legend className="p-0 text-sm font-semibold text-ink">{t('form.outcomesLegend')}</legend>
      <p id={hintId} className="m-0 text-[13px] text-meta">
        {t('form.outcomesHint')}
      </p>
      {criterion.outcomes.map((outcome, index) => (
        <div key={index} className="flex flex-wrap items-end gap-2">
          <div className="min-w-0 flex-1 basis-60">
            <TextInput
              id={`${fieldId}-outcome-${index}`}
              label={t('form.outcome', { number: index + 1, criterion: number })}
              maxLength={criteriaLimits.outcomeLength}
              value={outcome}
              onChange={(event) => onChange(withOutcome(criterion, index, event.target.value))}
            />
          </div>
          {criterion.outcomes.length > 1 && (
            <Button variant="secondary" onClick={() => onChange(withoutOutcome(criterion, index))}>
              {t('form.removeOutcome', { number: index + 1, criterion: number })}
            </Button>
          )}
        </div>
      ))}
      {criterion.outcomes.length < criteriaLimits.maxOutcomes && (
        <Button
          variant="secondary"
          className="w-fit"
          onClick={() => onChange({ ...criterion, outcomes: [...criterion.outcomes, ''] })}
        >
          {t('form.addOutcome')}
        </Button>
      )}
    </fieldset>
  );
}

/**
 * The fields of one criterion.
 *
 * @returns the group: label, maximum, description, outcomes and "Remove criterion"
 */
function CriterionFields(props: CriterionFieldsProps) {
  const { fieldId, number, criterion, canRemove, onChange, onRemove } = props;
  const { t } = useClassCompetitionsTranslation();
  return (
    <fieldset className="m-0 flex flex-col gap-4 rounded-2xl border border-border px-4 py-4">
      <legend className="px-1 font-heading text-lg font-bold text-heading">
        {t('form.criterion', { number })}
      </legend>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_160px]">
        <TextInput
          id={`${fieldId}-label`}
          label={t('form.label')}
          hint={t('form.labelHint')}
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
      <Textarea
        id={`${fieldId}-description`}
        label={t('form.description')}
        hint={t('form.descriptionHint')}
        maxLength={criteriaLimits.descriptionLength}
        value={criterion.description}
        onChange={(event) => onChange({ ...criterion, description: event.target.value })}
      />
      <OutcomeFields {...props} />
      {canRemove && (
        <Button variant="secondary" className="w-fit" onClick={onRemove}>
          {t('form.removeCriterion', { number })}
        </Button>
      )}
    </fieldset>
  );
}

/**
 * Renders the editor.
 *
 * @returns the criteria's fields and "Add a criterion"
 */
export function CriteriaEditor({ idPrefix, criteria, onChange }: CriteriaEditorProps) {
  const { t } = useClassCompetitionsTranslation();
  return (
    <div className="flex flex-col gap-4">
      {criteria.map((criterion, index) => (
        <CriterionFields
          key={index}
          fieldId={`${idPrefix}-criterion-${index}`}
          number={index + 1}
          criterion={criterion}
          canRemove={criteria.length > 1}
          onChange={(next) => onChange(withCriterion(criteria, index, next))}
          onRemove={() => onChange(withoutCriterion(criteria, index))}
        />
      ))}
      {criteria.length < criteriaLimits.maxCriteria && (
        <Button
          variant="secondary"
          className="w-fit"
          onClick={() => onChange([...criteria, emptyCriterion()])}
        >
          {t('form.addCriterion')}
        </Button>
      )}
    </div>
  );
}
