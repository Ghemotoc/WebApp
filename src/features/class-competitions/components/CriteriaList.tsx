/**
 * CriteriaList: a competition's criteria in full, for reading (bundle CLASS-POINTS, part 2;
 * story S1-E8-15 criterion 5: pupils see every criterion, with its description and outcomes,
 * from the start; Robert, 13 Nov 2026, 19:20 UTC).
 *
 * Who shows it: ClassCompetitionCard. What it calls: nothing.
 */
import type { Criterion } from '../api/classCompetitions';
import { useClassCompetitionsTranslation } from '../registerClassCompetitionsTranslations';

/**
 * Renders the criteria.
 *
 * @param props.criteria - the criteria, in the teacher's order
 * @returns a headed list: label and maximum, description, then what the work must have
 */
export function CriteriaList({ criteria }: { criteria: Criterion[] }) {
  const { t } = useClassCompetitionsTranslation();
  return (
    <div className="flex flex-col gap-3">
      <h3 className="m-0 font-heading text-lg font-bold text-heading">{t('criteria.heading')}</h3>
      <ol className="m-0 flex list-none flex-col gap-3 p-0">
        {criteria.map((criterion, index) => (
          <li
            key={criterion.id ?? index}
            className="flex flex-col gap-1.5 rounded-2xl border border-border px-4 py-3"
          >
            <p className="m-0 font-semibold text-ink">
              {criterion.label}{' '}
              <span className="font-normal text-meta">
                ({t('criteria.points', { count: criterion.maxPoints })})
              </span>
            </p>
            <p className="m-0 text-sm text-body">{criterion.description}</p>
            <p className="m-0 text-sm font-semibold text-ink">{t('criteria.mustHave')}</p>
            <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-sm text-body">
              {criterion.outcomes.map((outcome, outcomeIndex) => (
                <li key={outcomeIndex}>{outcome}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}
