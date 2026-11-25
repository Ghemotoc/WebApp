/**
 * MapLines: the relationship map's lines (story S1-E17-15; user stories bundle 6, story 6.6,
 * board E25: "lines wear the category colour the writer chose and also differ by style").
 *
 * One SVG under the cards, each line from card centre to card centre in its category's colour
 * (CALM-9) and its own line style (solid, dotted, dashed, fine dots), so colour is never the only
 * cue. Every swatch stands 3:1 off the map's box by itself. It is drawing only, hidden from
 * screen readers: the list under the map says every relationship in words.
 * Who uses it: RelationshipMap. What it calls: the category helpers.
 */
import { categoryOf, lineStyleOf, type RelationshipColours } from '../lib/relationshipCategories';
import type { MapLayout } from '../lib/relationshipMap';

/** What the lines need. */
export interface MapLinesProps {
  layout: MapLayout;
  /** The colours the writer picked for the categories. */
  colours: RelationshipColours;
}

/**
 * Renders the lines.
 *
 * @returns the SVG, hidden from screen readers
 */
export function MapLines({ layout, colours }: MapLinesProps) {
  return (
    <svg
      aria-hidden="true"
      width={layout.width}
      height={layout.height}
      className="pointer-events-none absolute inset-0"
    >
      {layout.edges.map((edge) => {
        const category = categoryOf(edge.relationship.kind);
        const style = lineStyleOf(category, colours);
        return (
          <path
            key={edge.relationship.id}
            data-category={category}
            data-colour={style.colour}
            d={edge.path}
            fill="none"
            stroke={style.colour}
            strokeWidth={style.width}
            strokeDasharray={style.dashes}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}
