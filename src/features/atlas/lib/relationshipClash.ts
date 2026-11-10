/**
 * Spots a relationship that clashes with one already there (bundle G10 ATLAS, part b; handoff
 * A5: "This clashes with a relationship already here … Both can be true in a story"; never a
 * block).
 *
 * Two family ties between the same two characters clash when they differ ("parent of" and
 * "sibling of"), or when the same parent tie runs both ways (Ana parent of Vali, Vali parent of
 * Ana). Everything else can sit side by side: partners who are also rivals, a friend who killed.
 * The check runs on the relationships the form already has, so it needs nothing from the
 * database. isAlreadyThere() spots the same relationship a second time, which is recorded once
 * (GAPS-3 break test, 10 Nov 2026). Who calls it: AddRelationshipForm and AddToTreeForm
 * (findClash) and useRelationshipAdd (isAlreadyThere). What it calls: nothing.
 */
import type { CharacterRelationship, RelationshipKind } from '../api/characters';

/** The family ties that can't usually all hold between the same two people. */
const familyTies: readonly RelationshipKind[] = [
  'parent_of',
  'sibling_of',
  'partner_of',
  'cousin_of',
];

/** The part of a new relationship the check reads. */
export interface ProposedRelationship {
  fromId: string;
  toId: string;
  kind: RelationshipKind;
}

/**
 * Whether one existing relationship clashes with the proposed one.
 *
 * @param existing - a relationship already saved
 * @param proposed - the one the writer is about to save
 * @returns true when both are family ties between the same two that don't fit together
 */
function clashes(existing: CharacterRelationship, proposed: ProposedRelationship): boolean {
  // Step 1: only the same two characters, whichever way round.
  const sameWay = existing.fromId === proposed.fromId && existing.toId === proposed.toId;
  const otherWay = existing.fromId === proposed.toId && existing.toId === proposed.fromId;
  if (!sameWay && !otherWay) return false;
  // Step 2: only family ties clash.
  if (!familyTies.includes(existing.kind) || !familyTies.includes(proposed.kind)) return false;
  // Step 3: two different ties clash; the same parent tie clashes only when it is reversed.
  if (existing.kind !== proposed.kind) return true;
  return existing.kind === 'parent_of' && otherWay;
}

/**
 * The first relationship already saved that clashes with the proposed one.
 *
 * @param relationships - the story's relationships
 * @param proposed - the one about to be saved
 * @returns the clashing relationship, or null when there is none
 */
export function findClash(
  relationships: readonly CharacterRelationship[],
  proposed: ProposedRelationship,
): CharacterRelationship | null {
  return relationships.find((existing) => clashes(existing, proposed)) ?? null;
}

/** The types that say the same thing from both sides, as add_character_relationship() has them. */
const readsBothWays: readonly RelationshipKind[] = [
  'sibling_of',
  'partner_of',
  'cousin_of',
  'friend_of',
  'ally_of',
  'enemy_of',
];

/**
 * Whether the proposed relationship is already saved: the same two characters and the same type,
 * the same way round, or either way round for a type that reads the same from both sides.
 *
 * @param relationships - the story's relationships
 * @param proposed - the one about to be saved
 * @returns true when it is already there; never for "Other", which is the writer's own words
 */
export function isAlreadyThere(
  relationships: readonly CharacterRelationship[],
  proposed: ProposedRelationship,
): boolean {
  if (proposed.kind === 'custom') return false;
  return relationships.some((existing) => {
    if (existing.kind !== proposed.kind) return false;
    const sameWay = existing.fromId === proposed.fromId && existing.toId === proposed.toId;
    const otherWay = existing.fromId === proposed.toId && existing.toId === proposed.fromId;
    return sameWay || (otherWay && readsBothWays.includes(proposed.kind));
  });
}
