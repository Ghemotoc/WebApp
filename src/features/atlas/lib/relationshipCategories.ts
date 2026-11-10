/**
 * The six categories of the relationship map and how each one's lines look (story S1-E17-15:
 * "each category differs in both colour and line style (conflict dashed, lineage dotted), so
 * meaning never relies on colour alone").
 *
 * Who calls it: RelationshipMap and its legend. What it calls: nothing. The colours are CSS
 * variables in src/styles/index.css (--atlas-line-*), with light and night values that keep at
 * least 3:1 against the card (WCAG 2.2, 1.4.11).
 */
import type { RelationshipKind } from '../api/characters';

/** The categories, in the order the switches show them. */
export const relationshipCategories = [
  'family',
  'love',
  'lineage',
  'allies',
  'conflict',
  'other',
] as const;
export type RelationshipCategory = (typeof relationshipCategories)[number];

/** Which category each type belongs to. */
const categoryOfKind: Record<RelationshipKind, RelationshipCategory> = {
  parent_of: 'family',
  sibling_of: 'family',
  partner_of: 'family',
  cousin_of: 'family',
  loves: 'love',
  made: 'lineage',
  friend_of: 'allies',
  ally_of: 'allies',
  mentors: 'allies',
  works_for: 'allies',
  enemy_of: 'conflict',
  resents: 'conflict',
  killed: 'conflict',
  custom: 'other',
};

/**
 * The category of a relationship type.
 *
 * @param kind - the type
 * @returns its category
 */
export function categoryOf(kind: RelationshipKind): RelationshipCategory {
  return categoryOfKind[kind];
}

/** How one category's lines are drawn: the colour variable, the dash pattern and the width. */
export interface LineStyle {
  colour: string;
  /** An SVG stroke-dasharray; empty for a solid line. */
  dashes: string;
  width: number;
}

/** Every category's look: solid, dash-dot, dotted, long dashes, dashed, dash-dot-dot. */
export const lineStyles: Record<RelationshipCategory, LineStyle> = {
  family: { colour: 'var(--atlas-line-family)', dashes: '', width: 2.5 },
  love: { colour: 'var(--atlas-line-love)', dashes: '12 4 2 4', width: 2.5 },
  lineage: { colour: 'var(--atlas-line-lineage)', dashes: '1 5', width: 3 },
  allies: { colour: 'var(--atlas-line-allies)', dashes: '16 6', width: 2.5 },
  conflict: { colour: 'var(--atlas-line-conflict)', dashes: '7 5', width: 2.5 },
  other: { colour: 'var(--atlas-line-other)', dashes: '8 3 2 3 2 3', width: 2.5 },
};
