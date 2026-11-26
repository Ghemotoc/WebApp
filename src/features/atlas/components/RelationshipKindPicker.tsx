/**
 * RelationshipKindPicker: the one "Relationship" drop-down of "Add a relationship" (user stories
 * bundle 6, story 6.5, board E24: "Relationship lists the twelve kinds plus Custom (your own
 * label)"). It replaces the two drop-downs of bundle G10, Kind and then Relationship.
 *
 * Every kind is listed in the board's order, "Cousin of" included (bundle GAPS-3 added it, so a
 * story's cousins keep their kind), and Custom comes last; RelationshipOwnWords then asks for the
 * writer's label. Who uses it: AddRelationshipForm. What it calls: the change prop with the new
 * kind.
 */
import { Select } from '@/components/ui/Select';

import { relationshipKinds, type NewRelationship, type RelationshipKind } from '../api/characters';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/** What the drop-down needs. */
export interface RelationshipKindPickerProps {
  idPrefix: string;
  kind: RelationshipKind;
  change: (part: Partial<NewRelationship>) => void;
}

/**
 * Renders "Relationship".
 *
 * @returns the drop-down of every kind, Custom last
 */
export function RelationshipKindPicker({ idPrefix, kind, change }: RelationshipKindPickerProps) {
  const { t } = useAtlasTranslation();
  // Custom reads "Custom (your own label)" here; elsewhere (the map's legend) it stays short.
  const options = relationshipKinds.map((value) => ({
    value,
    label: value === 'custom' ? t('connections.add.customOption') : t(`connections.kinds.${value}`),
  }));
  return (
    <Select
      id={`${idPrefix}-kind`}
      label={t('connections.add.kind')}
      isLabelVisible
      isLabelAbove
      options={options}
      value={kind}
      onChange={(value) => change({ kind: value as RelationshipKind })}
    />
  );
}
