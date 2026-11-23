/**
 * The six categories of the relationship map, the eight colours a writer can give them and how
 * each category's lines look (story S1-E17-15; CALM-9, board E25: "Category colours: one row per
 * category with 8 round swatches ... Save the choice per story").
 *
 * Meaning never rests on colour alone (WCAG 2.2, 1.4.1): every line carries its label in words,
 * every chip its category's name, and the line style is the second cue Robert kept (CALM-9, E25:
 * "solid for family and allies, dotted for love and other, dashed for conflict"; lineage, which
 * the key leaves out, keeps fine dots of its own). This replaces S1-E17-15's six line styles.
 * Who calls it: RelationshipMap, MapLines, MapCategorySwitches, CategoryColoursFold,
 * RelationshipList and FamilyTreeLines. What it calls: nothing. The colours are CSS variables in
 * src/styles/tokens.css (--atlas-swatch-*), with day and night values, each at least 3:1 against
 * the card by itself (WCAG 2.2, 1.4.11; Robert, 23 Nov 2026: darker shades by day).
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

/** The eight swatches, in the order the colour picker shows them (board E25). */
export const relationshipSwatches = [
  'blue',
  'pink',
  'yellow',
  'aqua',
  'orange',
  'violet',
  'green',
  'red',
] as const;
export type RelationshipSwatch = (typeof relationshipSwatches)[number];

/** The colours a writer picked, only for the categories they changed (story_cast()'s map). */
export type RelationshipColours = Partial<Record<RelationshipCategory, RelationshipSwatch>>;

/** Each category's colour until the writer picks another (board E25). */
export const defaultSwatches: Record<RelationshipCategory, RelationshipSwatch> = {
  family: 'blue',
  love: 'pink',
  lineage: 'yellow',
  allies: 'aqua',
  conflict: 'orange',
  other: 'violet',
};

/**
 * True when a value from the database is one of the eight swatch names.
 *
 * @param value - anything
 * @returns whether it names a swatch
 */
export function isRelationshipSwatch(value: unknown): value is RelationshipSwatch {
  return relationshipSwatches.some((swatch) => swatch === value);
}

/**
 * The swatch one category is drawn in: the writer's pick, or the category's default.
 *
 * @param category - the category
 * @param colours - the writer's picks
 * @returns the swatch's name
 */
export function swatchOf(
  category: RelationshipCategory,
  colours: RelationshipColours,
): RelationshipSwatch {
  return colours[category] ?? defaultSwatches[category];
}

/**
 * The CSS colour of a swatch, which follows day and night mode.
 *
 * @param swatch - the swatch's name
 * @returns a var() reference to its token
 */
export function swatchColour(swatch: RelationshipSwatch): string {
  return `var(--atlas-swatch-${swatch})`;
}

/** How one category's lines are drawn: the colour, the dash pattern and the width. */
export interface LineStyle {
  colour: string;
  /** An SVG stroke-dasharray; empty for a solid line. */
  dashes: string;
  width: number;
}

/**
 * Each category's dashes and width (board E25: .maplines is-love "2 6" with round ends,
 * is-conflict "10 6"); lineage fine dots, so the key's three groups stay apart from it.
 */
export const lineShapes: Record<RelationshipCategory, Omit<LineStyle, 'colour'>> = {
  family: { dashes: '', width: 2.5 },
  love: { dashes: '2 6', width: 3 },
  lineage: { dashes: '1 4', width: 2.5 },
  allies: { dashes: '', width: 2.5 },
  conflict: { dashes: '10 6', width: 2.5 },
  other: { dashes: '2 6', width: 3 },
};

/**
 * How one category's lines look on this story's map.
 *
 * @param category - the category
 * @param colours - the writer's picks (an empty map for the defaults)
 * @returns the colour, dashes and width
 */
export function lineStyleOf(
  category: RelationshipCategory,
  colours: RelationshipColours,
): LineStyle {
  return { ...lineShapes[category], colour: swatchColour(swatchOf(category, colours)) };
}

/**
 * Reads the colours map story_cast() returns, keeping only known categories and swatches, so a
 * stray value can never reach a CSS variable name.
 *
 * @param value - the map as the database sent it
 * @returns the writer's picks
 */
export function toRelationshipColours(value: unknown): RelationshipColours {
  const colours: RelationshipColours = {};
  if (typeof value !== 'object' || value === null) return colours;
  const entries = value as Record<string, unknown>;
  for (const category of relationshipCategories) {
    const swatch = entries[category];
    if (isRelationshipSwatch(swatch)) colours[category] = swatch;
  }
  return colours;
}
