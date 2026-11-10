/**
 * MapCards: the character cards on the relationship map (bundle G10 ATLAS, part b2; board
 * AtlasConnections: glass cards like the family tree's, the picture when there is one, the name
 * and the one-line summary).
 *
 * Each card is a real link to the sheet (or a reader page), so it can be reached by keyboard. On
 * the writer's map the cards can be dragged (useCardDrag); with "Focus on" set, cards that aren't
 * the chosen character or linked to them fade back. Who uses it: RelationshipMap. What it calls:
 * CharacterAvatar and MaybeLink.
 */
import type { PointerEvent } from 'react';

import type { StoryCast } from '../api/characters';
import type { useCardDrag } from '../hooks/useCardDrag';
import { visiblePictureUrl } from '../lib/characterPicture';
import { cardHeight, cardWidth, type MapNode } from '../lib/relationshipMap';

import { CharacterAvatar } from './CharacterAvatar';
import { MaybeLink } from './MaybeLink';

/** What the cards need. */
export interface MapCardsProps {
  addressOf: (characterId: string) => string | null;
  cast: StoryCast;
  nodes: MapNode[];
  /** The drag handlers, or null on a readers' map. */
  drag: ReturnType<typeof useCardDrag> | null;
  /** The characters to show at full strength; null shows everyone. */
  inFocus: Set<string> | null;
}

/** A card's pointer handlers on the writer's map; none on a readers' map. */
function dragHandlersFor(drag: MapCardsProps['drag'], node: MapNode) {
  if (drag === null) return {};
  return {
    onPointerDown: (event: PointerEvent<HTMLLIElement>) => drag.onPointerDown(node, event),
    onPointerMove: drag.onPointerMove,
    onPointerUp: drag.onPointerUp,
    onClickCapture: drag.onClickCapture,
  };
}

/** One card: the glass link with the picture, name and summary, placed on the map. */
function MapCard({
  addressOf,
  character,
  node,
  drag,
  isFaded,
}: {
  addressOf: MapCardsProps['addressOf'];
  character: StoryCast['characters'][number];
  node: MapNode;
  drag: MapCardsProps['drag'];
  isFaded: boolean;
}) {
  // The dragged card is drawn where the pointer is.
  const live = drag?.live ?? null;
  const place = live !== null && live.id === node.id ? live : node;
  const summary = character.sheet.summary ?? '';
  const dragClasses = drag ? 'cursor-grab touch-none active:cursor-grabbing' : '';
  return (
    <li
      data-map-card={node.id}
      className={`absolute transition-opacity ${isFaded ? 'opacity-30' : ''} ${dragClasses}`}
      style={{ left: place.x, top: place.y, width: cardWidth, height: cardHeight }}
      {...dragHandlersFor(drag, node)}
    >
      <MaybeLink
        to={addressOf(node.id)}
        isNativeDragOff={drag !== null}
        className="flex size-full flex-col items-center justify-center gap-1 overflow-hidden rounded-[24px] border border-border bg-surface px-3 py-2 text-center no-underline shadow-card select-none"
      >
        {/* A picture only when there is one: no initials circle (G10a). */}
        {visiblePictureUrl(character) !== null && (
          <CharacterAvatar character={character} size="small" />
        )}
        <span className="max-w-full text-sm font-semibold break-words text-heading">
          {character.name}
        </span>
        {summary !== '' && <span className="max-w-full truncate text-xs text-meta">{summary}</span>}
      </MaybeLink>
    </li>
  );
}

/**
 * Renders the cards.
 *
 * @returns one list item per card
 */
export function MapCards({ addressOf, cast, nodes, drag, inFocus }: MapCardsProps) {
  return (
    <ul className="m-0 list-none p-0">
      {nodes.map((node) => {
        const character = cast.characters.find((candidate) => candidate.id === node.id);
        if (character === undefined) return null;
        return (
          <MapCard
            key={node.id}
            addressOf={addressOf}
            character={character}
            node={node}
            drag={drag}
            isFaded={inFocus !== null && !inFocus.has(node.id)}
          />
        );
      })}
    </ul>
  );
}
