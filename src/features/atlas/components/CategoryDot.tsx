/**
 * CategoryDot: the small round colour dot of one relationship category (CALM-9, board E25: "each
 * category has a colour, shown as a dot on its filter chip, on its map lines and on the list
 * labels"; .reldot, 10 px).
 *
 * Every swatch stands 3:1 off the card by itself (WCAG 2.2, 1.4.11). It is decoration only: the category's name always sits beside it.
 * Who uses it: MapCategorySwitches, CategoryColoursFold and RelationshipList. What it calls: the
 * category helpers.
 */
import {
  swatchColour,
  swatchOf,
  type RelationshipCategory,
  type RelationshipColours,
} from '../lib/relationshipCategories';

/**
 * Draws one category's dot in the colour the writer picked.
 *
 * @param props.category - the category
 * @param props.colours - the writer's picks
 * @returns a hidden-from-screen-readers dot
 */
export function CategoryDot({
  category,
  colours,
}: {
  category: RelationshipCategory;
  colours: RelationshipColours;
}) {
  return (
    <span
      aria-hidden="true"
      data-category-dot={category}
      className="inline-block size-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: swatchColour(swatchOf(category, colours)) }}
    />
  );
}
