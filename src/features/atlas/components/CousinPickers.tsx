/**
 * CousinPickers: which cousin and how many generations apart, for a "Cousin of" relationship
 * (bundle G10 ATLAS, part b; handoff, family tree: "cousin, second, third, removed").
 *
 * The database accepts first to third cousins, 0 to 3 times removed (…_g10b_relationships.sql),
 * so the drop-downs offer exactly those. Who uses it: AddRelationshipForm. What it calls: the
 * change prop.
 */
import { Select } from '@/components/ui/Select';

import type { NewRelationship } from '../api/characters';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/** What the two drop-downs need. */
export interface CousinPickersProps {
  idPrefix: string;
  degree: number | null;
  removed: number | null;
  change: (part: Partial<NewRelationship>) => void;
}

/** The degrees and the generations apart the database allows. */
const degrees = [1, 2, 3];
const generationsApart = [0, 1, 2, 3];

/**
 * Renders "Which cousin" and "Generations apart".
 *
 * @returns the two drop-downs
 */
export function CousinPickers({ idPrefix, degree, removed, change }: CousinPickersProps) {
  const { t } = useAtlasTranslation();
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      <Select
        id={`${idPrefix}-cousin-degree`}
        label={t('connections.add.cousinDegree')}
        isLabelVisible
        options={degrees.map((value) => ({
          value: String(value),
          label: t(`connections.add.cousinDegree${value}`),
        }))}
        value={String(degree ?? 1)}
        onChange={(value) => change({ cousinDegree: Number(value) })}
      />
      <Select
        id={`${idPrefix}-cousin-removed`}
        label={t('connections.add.cousinRemoved')}
        isLabelVisible
        options={generationsApart.map((value) => ({
          value: String(value),
          label: t(`connections.add.cousinRemoved${value}`),
        }))}
        value={String(removed ?? 0)}
        onChange={(value) => change({ cousinRemoved: Number(value) })}
      />
    </div>
  );
}
