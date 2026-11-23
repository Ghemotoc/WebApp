/**
 * MapLines: the relationship map's lines and their labels (story S1-E17-15; bundle G10 ATLAS,
 * part b2, board AtlasConnections: labels sit on small glass chips over the middle of each line).
 *
 * The lines are an SVG under the cards, each category in the colour the writer picked (CALM-9,
 * board E25) and its own line style, with an arrow at the second character. A thin edge runs
 * under every line, so even a light colour stands 3:1 off the card. The labels are HTML chips
 * laid over the lines, so they keep the page's fonts and wrap like text. Both are drawing only (hidden from screen readers): the same
 * relationships are written out in the List view. With "Focus on" set, lines that don't touch
 * the chosen character fade back.
 * Who uses it: RelationshipMap. What it calls: the category helpers and the words hook's label.
 */
import type { RelationshipWords } from '../hooks/useRelationshipWords';
import {
  categoryOf,
  lineEdgeColour,
  lineStyleOf,
  relationshipCategories,
  type RelationshipColours,
} from '../lib/relationshipCategories';
import type { MapEdge, MapLayout } from '../lib/relationshipMap';

/** What the lines need. */
export interface MapLinesProps {
  layout: MapLayout;
  words: RelationshipWords;
  /** The character in focus, or null for everyone. */
  focusId: string | null;
  /** The colours the writer picked for the categories. */
  colours: RelationshipColours;
}

/** True when a line should fade because it doesn't touch the character in focus. */
function isFaded(edge: MapEdge, focusId: string | null): boolean {
  if (focusId === null) return false;
  return edge.relationship.fromId !== focusId && edge.relationship.toId !== focusId;
}

/** One arrow head per category, in that category's colour with the same thin edge. */
function ArrowMarkers({ colours }: { colours: RelationshipColours }) {
  return (
    <defs>
      {relationshipCategories.map((category) => (
        <marker
          key={category}
          id={`atlas-arrow-${category}`}
          viewBox="0 0 10 10"
          refX="5"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path
            d="M 0 0 L 10 5 L 0 10 z"
            fill={lineStyleOf(category, colours).colour}
            stroke={lineEdgeColour}
            strokeWidth={1}
          />
        </marker>
      ))}
    </defs>
  );
}

/**
 * Renders the lines, then the label chips over them.
 *
 * @returns the SVG and the labels, both hidden from screen readers
 */
export function MapLines({ layout, words, focusId, colours }: MapLinesProps) {
  return (
    <>
      <svg
        aria-hidden="true"
        width={layout.width}
        height={layout.height}
        className="pointer-events-none absolute inset-0"
      >
        <ArrowMarkers colours={colours} />
        {layout.edges.map((edge) => {
          const category = categoryOf(edge.relationship.kind);
          const style = lineStyleOf(category, colours);
          return (
            <g
              key={edge.relationship.id}
              data-category={category}
              data-colour={style.colour}
              opacity={isFaded(edge, focusId) ? 0.2 : 1}
            >
              {/* The edge first, 2 px wider, so the colour sits inside it. */}
              <path
                d={edge.path}
                fill="none"
                stroke={lineEdgeColour}
                strokeWidth={style.width + 2}
                strokeDasharray={style.dashes}
                strokeLinecap="round"
              />
              <path
                d={edge.path}
                fill="none"
                stroke={style.colour}
                strokeWidth={style.width}
                strokeDasharray={style.dashes}
                strokeLinecap="round"
                markerEnd={`url(#atlas-arrow-${category})`}
              />
            </g>
          );
        })}
      </svg>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {layout.edges.map((edge) => (
          <span
            key={edge.relationship.id}
            data-map-label
            className={`absolute max-w-[140px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-surface px-2 py-0.5 text-center text-xs leading-tight font-semibold break-words text-ink shadow-card ${isFaded(edge, focusId) ? 'opacity-20' : ''}`}
            style={{ left: edge.labelX, top: edge.labelY }}
          >
            {words.label(edge.relationship)}
          </span>
        ))}
      </div>
    </>
  );
}
