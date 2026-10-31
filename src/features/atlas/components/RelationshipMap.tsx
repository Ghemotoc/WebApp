/**
 * RelationshipMap: the web of a story's cast on the Connections page (story S1-E17-15).
 *
 * - Characters are nodes and relationships labelled lines, laid out by lib/relationshipMap.ts.
 * - Each category has its own colour and its own line style (lib/relationshipCategories.ts), so
 *   meaning never rests on colour alone; the category switches double as the legend, each with a
 *   sample of its line, and turning one off hides its lines.
 * - Every node is a real link to that character's sheet (or, on a readers' page, their public
 *   page while Characters is public), so it can be reached by keyboard.
 * - The map sits in its own focusable region that scrolls sideways on a phone; the page doesn't.
 * - The lines are drawing only (hidden from screen readers): the same relationships are written
 *   out under "All relationships" on the same page.
 * Who uses it: ConnectionsPage and PublicConnections. What it calls: the layout and category helpers.
 */
import { useState } from 'react';

import { Chip } from '@/components/ui/Chip';

import type { StoryCast } from '../api/characters';
import type { RelationshipWords } from '../hooks/useRelationshipWords';
import {
  categoryOf,
  lineStyles,
  relationshipCategories,
  type RelationshipCategory,
} from '../lib/relationshipCategories';
import { layoutRelationshipMap, nodeRadius, type MapLayout } from '../lib/relationshipMap';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { CharacterAvatar } from './CharacterAvatar';
import { MaybeLink } from './MaybeLink';

/** What the map needs. */
export interface RelationshipMapProps {
  /** Where a character's node opens: their sheet, a reader page, or null for no link. */
  addressOf: (characterId: string) => string | null;
  cast: StoryCast;
  words: RelationshipWords;
}

/** A short sample of one category's line, for its switch. */
function LineSample({ category }: { category: RelationshipCategory }) {
  const style = lineStyles[category];
  return (
    // The sample sits on the card's colour, so it shows on a switched-on (dark) chip too.
    <svg
      aria-hidden="true"
      width="32"
      height="14"
      viewBox="0 0 32 14"
      className="shrink-0 rounded-full bg-surface"
    >
      <line
        x1="4"
        y1="7"
        x2="28"
        y2="7"
        stroke={style.colour}
        strokeWidth={style.width}
        strokeDasharray={style.dashes}
      />
    </svg>
  );
}

/** One arrow head per category, in that category's colour. */
function ArrowMarkers() {
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
          <path d="M 0 0 L 10 5 L 0 10 z" fill={lineStyles[category].colour} />
        </marker>
      ))}
    </defs>
  );
}

/** The lines and their labels, drawn under the nodes. */
function MapLines({ layout, words }: { layout: MapLayout; words: RelationshipWords }) {
  return (
    <svg
      aria-hidden="true"
      width={layout.size}
      height={layout.size}
      className="pointer-events-none absolute inset-0"
    >
      <ArrowMarkers />
      {layout.edges.map((edge) => {
        const category = categoryOf(edge.relationship.kind);
        const style = lineStyles[category];
        return (
          <g key={edge.relationship.id} data-category={category}>
            <path
              d={edge.path}
              fill="none"
              stroke={style.colour}
              strokeWidth={style.width}
              strokeDasharray={style.dashes}
              strokeLinecap="round"
              markerEnd={`url(#atlas-arrow-${category})`}
            />
            {/* The label sits on a halo of the card's colour, so it reads over any line. */}
            <text
              x={edge.labelX}
              y={edge.labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-ink font-body text-xs font-semibold"
              stroke="var(--surface)"
              strokeWidth="5"
              paintOrder="stroke"
            >
              {words.label(edge.relationship)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** The nodes: each a link to the character's sheet, with the name under the picture. */
function MapNodes({
  addressOf,
  cast,
  layout,
}: {
  addressOf: RelationshipMapProps['addressOf'];
  cast: StoryCast;
  layout: MapLayout;
}) {
  return (
    <ul className="m-0 list-none p-0">
      {layout.nodes.map((node) => {
        const character = cast.characters.find((candidate) => candidate.id === node.id);
        if (character === undefined) return null;
        return (
          <li
            key={node.id}
            className="absolute w-[120px]"
            style={{ left: node.x - 60, top: node.y - nodeRadius }}
          >
            <MaybeLink
              to={addressOf(node.id)}
              className="flex flex-col items-center gap-1 rounded-card text-center no-underline"
            >
              <span className="flex size-14 items-center justify-center rounded-full border-2 border-control-border bg-surface">
                <CharacterAvatar character={character} size="small" />
              </span>
              <span className="max-w-full rounded-md bg-surface px-1 text-sm font-semibold break-words text-heading">
                {character.name}
              </span>
            </MaybeLink>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Renders the map with its category switches.
 *
 * @returns the switches and the scrolling map
 */
export function RelationshipMap({ addressOf, cast, words }: RelationshipMapProps) {
  const { t } = useAtlasTranslation();
  const [hiddenCategories, setHiddenCategories] = useState<RelationshipCategory[]>([]);
  // Step 1: only the relationships whose category is switched on.
  const shown = cast.relationships.filter(
    (relationship) => !hiddenCategories.includes(categoryOf(relationship.kind)),
  );
  const layout = layoutRelationshipMap(
    cast.characters.map((character) => character.id),
    shown,
  );

  /** Turns one category's lines on or off. */
  function toggle(category: RelationshipCategory, isShown: boolean) {
    setHiddenCategories(
      isShown
        ? hiddenCategories.filter((hidden) => hidden !== category)
        : [...hiddenCategories, category],
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div
        role="group"
        aria-label={t('connections.map.categoriesLabel')}
        className="flex flex-wrap gap-2"
      >
        {relationshipCategories.map((category) => (
          <Chip
            key={category}
            isPressed={!hiddenCategories.includes(category)}
            onPressedChange={(isShown) => toggle(category, isShown)}
          >
            <LineSample category={category} />
            {t(`connections.categories.${category}`)}
          </Chip>
        ))}
      </div>
      {cast.relationships.length === 0 && (
        <p className="m-0 text-body">{t('connections.map.none')}</p>
      )}
      {/* Step 2: the map scrolls inside its own region; the region can be focused and scrolled
          by keyboard (DoD: a sideways list without arrows keeps its scrollbar). */}
      <div
        role="region"
        aria-label={t('connections.map.region')}
        tabIndex={0}
        className="max-w-full overflow-x-auto rounded-card border border-hairline"
        data-testid="atlas-relationship-map"
      >
        <div className="relative mx-auto" style={{ width: layout.size, height: layout.size }}>
          <MapLines layout={layout} words={words} />
          <MapNodes addressOf={addressOf} cast={cast} layout={layout} />
        </div>
      </div>
    </div>
  );
}
