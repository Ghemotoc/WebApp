/**
 * The five kinds the "Add a relationship" form offers first, and which relationship types sit
 * under each (bundle G10 ATLAS, part b; handoff A4: "Kind (Family, Love, Allies, Conflict,
 * Other), then Relationship, then Other character").
 *
 * The map keeps its own six categories (relationshipCategories.ts, with Lineage on its own); the
 * form folds "Turned or made" into Family, because a writer looking for it thinks of it as kin.
 * Who calls it: RelationshipKindPickers. What it calls: nothing.
 */
import type { RelationshipKind } from '../api/characters';

/** The kinds, in the order the form shows them. */
export const relationshipGroups = ['family', 'love', 'allies', 'conflict', 'other'] as const;
export type RelationshipGroup = (typeof relationshipGroups)[number];

/** The relationship types under each kind, in the order the second drop-down lists them. */
export const kindsInGroup: Record<RelationshipGroup, readonly RelationshipKind[]> = {
  family: ['parent_of', 'sibling_of', 'partner_of', 'cousin_of', 'made'],
  love: ['loves'],
  allies: ['friend_of', 'ally_of', 'mentors', 'works_for'],
  conflict: ['enemy_of', 'resents', 'killed'],
  other: ['custom'],
};

/**
 * The kind a relationship type belongs to in the form.
 *
 * @param kind - the relationship type
 * @returns its kind; "other" for the writer's own words
 */
export function groupOf(kind: RelationshipKind): RelationshipGroup {
  // Step 1: look through the kinds in order; every type sits under exactly one.
  for (const group of relationshipGroups) {
    if (kindsInGroup[group].includes(kind)) return group;
  }
  // Step 2: a type added later and not yet listed falls under Other, never nowhere.
  return 'other';
}
