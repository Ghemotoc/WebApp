/**
 * CriteriaList: a competition's criteria, for reading (bundle CLASS-POINTS, part 2; story
 * S1-E8-15 criterion 5; drawn as board G03-Class in bundle BOOKS-8, user story 8.3).
 *
 * What it shows (board G03): each criterion between hairlines: its label in bold with its points,
 * its description, and, once "What each criterion needs" is open, what the work must have (the
 * learning outcomes). Under them "Total 25 points". Pupils can read every criterion and outcome
 * from the start of the competition (Robert, 13 Nov 2026, 19:20 UTC); the outcomes sit one press
 * away, as the board draws them.
 * Who shows it: ClassCompetitionCard, which holds the open or closed state. What it calls: nothing.
 */
import { MetaLine } from '@/components/ui/MetaLine';

import type { Criterion } from '../api/classCompetitions';
import { useClassCompetitionsTranslation } from '../registerClassCompetitionsTranslations';

/** What the list needs. */
export interface CriteriaListProps {
  /** The criteria, in the teacher's order. */
  criteria: Criterion[];
  /** True while "What each criterion needs" is open. */
  showOutcomes: boolean;
  /** The list's id, for the toggle's aria-controls. */
  id: string;
}

/**
 * One criterion.
 *
 * @returns the list item
 */
function CriterionItem({
  criterion,
  showOutcomes,
}: {
  criterion: Criterion;
  showOutcomes: boolean;
}) {
  const { t } = useClassCompetitionsTranslation();
  return (
    <li className="flex flex-col gap-1 border-t border-hairline py-4">
      <MetaLine
        facts={[
          { text: criterion.label, kind: 'state' },
          { text: t('criteria.points', { count: criterion.maxPoints }) },
        ]}
      />
      <p className="m-0 type-body text-ink-muted">{criterion.description}</p>
      {showOutcomes && (
        <ul
          aria-label={t('criteria.outcomesLabel', { label: criterion.label })}
          className="m-0 mt-2 flex list-[circle] flex-col gap-1 pl-6 type-body text-ink"
        >
          {criterion.outcomes.map((outcome, outcomeIndex) => (
            <li key={outcomeIndex}>{outcome}</li>
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * Renders the criteria and their total.
 *
 * @returns the list and the total line
 */
export function CriteriaList({ criteria, showOutcomes, id }: CriteriaListProps) {
  const { t } = useClassCompetitionsTranslation();
  const total = criteria.reduce((sum, criterion) => sum + criterion.maxPoints, 0);
  return (
    <div className="flex flex-col">
      <ul id={id} aria-label={t('criteria.heading')} className="m-0 flex list-none flex-col p-0">
        {criteria.map((criterion, index) => (
          <CriterionItem
            key={criterion.id ?? index}
            criterion={criterion}
            showOutcomes={showOutcomes}
          />
        ))}
      </ul>
      <p className="m-0 max-w-none border-t border-hairline pt-3 type-meta text-ink-muted">
        {t('criteria.total', { count: total })}
      </p>
    </div>
  );
}
