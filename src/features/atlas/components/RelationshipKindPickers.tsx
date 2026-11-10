/**
 * RelationshipKindPickers: the "Kind" and "Relationship" drop-downs of "Add a relationship"
 * (bundle G10 ATLAS, part b; handoff A4: "Kind (Family, Love, Allies, Conflict, Other), then
 * Relationship, then Other character").
 *
 * Choosing a kind picks its first relationship, so the form is never left on a type from another
 * kind. "Other" has only the writer's own words, so its Relationship drop-down is left out and
 * RelationshipOwnWords asks for the words instead. Who uses it: AddRelationshipForm. What it
 * calls: the change prop with the new type.
 */
import { Select } from '@/components/ui/Select';

import type { NewRelationship, RelationshipKind } from '../api/characters';
import {
  groupOf,
  kindsInGroup,
  relationshipGroups,
  type RelationshipGroup,
} from '../lib/relationshipGroups';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/** What the two drop-downs need. */
export interface RelationshipKindPickersProps {
  idPrefix: string;
  kind: RelationshipKind;
  change: (part: Partial<NewRelationship>) => void;
}

/**
 * Renders "Kind" and, unless it is Other, "Relationship".
 *
 * @returns one or two drop-downs
 */
export function RelationshipKindPickers({ idPrefix, kind, change }: RelationshipKindPickersProps) {
  const { t } = useAtlasTranslation();
  const group = groupOf(kind);
  // The kinds use the map's category names (Family, Love, Allies, Conflict, Other).
  const groupOptions = relationshipGroups.map((value) => ({
    value,
    label: t(`connections.categories.${value}`),
  }));
  const kindOptions = kindsInGroup[group].map((value) => ({
    value,
    label: t(`connections.kinds.${value}`),
  }));
  return (
    <>
      <Select
        id={`${idPrefix}-group`}
        label={t('connections.add.group')}
        isLabelVisible
        options={groupOptions}
        value={group}
        onChange={(value) => change({ kind: kindsInGroup[value as RelationshipGroup][0] })}
      />
      {group !== 'other' && (
        <Select
          id={`${idPrefix}-kind`}
          label={t('connections.add.kind')}
          isLabelVisible
          options={kindOptions}
          value={kind}
          onChange={(value) => change({ kind: value as RelationshipKind })}
        />
      )}
    </>
  );
}
