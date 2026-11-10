/**
 * Turns "Add to this tree" into a relationship (bundle GAPS-3, board AtlasFamilyTree: "Add to
 * Mara's tree": a character and "How they're related to Mara").
 *
 * The tree's form asks how the picked character is related to the tree's own character, in plain
 * family words (parent, child, sibling, partner, cousin). A relationship is stored "<first> is
 * <type> <second>", so each answer says which of the two goes first:
 * - parent: the picked character is the parent of the tree's character;
 * - child: the tree's character is the parent of the picked one;
 * - sibling, partner, cousin: the picked character goes first (for a cousin removed, the first
 *   is the older one, as lib/familyTree.ts reads it).
 * Who calls it: AddToTreeForm. What it calls: nothing.
 */
import type { NewRelationship, RelationshipKind } from '../api/characters';

/** How the picked character is related to the tree's character, in the form's order. */
export const treeRelations = ['parent', 'child', 'sibling', 'partner', 'cousin'] as const;
export type TreeRelation = (typeof treeRelations)[number];

/** What the form has when Add is pressed. */
export interface TreeAddition {
  /** The tree's own character ("Whose tree"). */
  anchorId: string;
  /** The character being added to their tree. */
  otherId: string;
  relation: TreeRelation;
  /** For a cousin only: 1 to 3, and 0 to 3 generations apart. */
  cousinDegree: number;
  cousinRemoved: number;
  /** The writer's private note (how a clash is true, for example). */
  note: string;
}

/** The stored type behind each answer. */
const kindOf: Record<TreeRelation, RelationshipKind> = {
  parent: 'parent_of',
  child: 'parent_of',
  sibling: 'sibling_of',
  partner: 'partner_of',
  cousin: 'cousin_of',
};

/**
 * The relationship to save for one addition.
 *
 * @param addition - the tree's character, the picked one and how they are related
 * @returns the relationship, ready for add_character_relationship()
 */
export function relationshipForTree(addition: TreeAddition): NewRelationship {
  // Only "child" puts the tree's own character first: they are the parent.
  const anchorFirst = addition.relation === 'child';
  const isCousin = addition.relation === 'cousin';
  return {
    fromId: anchorFirst ? addition.anchorId : addition.otherId,
    toId: anchorFirst ? addition.otherId : addition.anchorId,
    kind: kindOf[addition.relation],
    customLabel: '',
    reverseLabel: '',
    cousinDegree: isCousin ? addition.cousinDegree : null,
    cousinRemoved: isCousin ? addition.cousinRemoved : null,
    note: addition.note,
  };
}
