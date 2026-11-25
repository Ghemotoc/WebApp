/**
 * MapCards: the people on the relationship map (story S1-E17-15; user stories bundle 6, story
 * 6.6, board E25's .mapnode: the name in bold over a short meta line, 8 by 12 px inside, 12 px
 * corners, a soft shadow).
 *
 * Each card is a real link to the character's sheet (or, on a readers' page, their public page
 * while Characters is public), so it can be reached by keyboard. The meta line is the year born
 * ("b. 1951") or the age, then the occupation or the character in a line. The protagonist is the
 * map's focus and wears a 2 px ring in the thread colour (board E25: "Mara (the focus) has a
 * violet ring"), with "protagonist" in their meta line, so the ring is never the only cue.
 * Who uses it: RelationshipMap. What it calls: useCardMeta and MaybeLink.
 */
import type { StoryCast, StoryCharacter } from '../api/characters';
import { useCardMeta } from '../hooks/useCardMeta';
import { cardHeight, cardWidth, type MapNode } from '../lib/relationshipMap';

import { MaybeLink } from './MaybeLink';

/** What the cards need. */
export interface MapCardsProps {
  addressOf: (characterId: string) => string | null;
  cast: StoryCast;
  nodes: MapNode[];
}

/** One card: the link with the name and the meta line, placed on the map. */
function MapCard({
  addressOf,
  character,
  node,
}: {
  addressOf: MapCardsProps['addressOf'];
  character: StoryCharacter;
  node: MapNode;
}) {
  const metaOf = useCardMeta(true);
  const meta = metaOf(character);
  const isFocus = character.role === 'protagonist';
  return (
    <li
      data-map-card={node.id}
      data-focus={isFocus ? 'true' : undefined}
      className="absolute"
      style={{ left: node.x, top: node.y, width: cardWidth, height: cardHeight }}
    >
      <MaybeLink
        to={addressOf(node.id)}
        className={`flex size-full flex-col justify-center overflow-hidden rounded-field bg-paper px-3 py-2 text-ink no-underline shadow-card ${isFocus ? 'ring-2 ring-thread ring-inset' : ''}`}
      >
        <span className="truncate type-label font-semibold text-ink-heading">{character.name}</span>
        {meta !== '' && <span className="truncate type-meta text-ink-muted">{meta}</span>}
      </MaybeLink>
    </li>
  );
}

/**
 * Renders the cards.
 *
 * @returns one list item per card
 */
export function MapCards({ addressOf, cast, nodes }: MapCardsProps) {
  return (
    <ul className="m-0 list-none p-0">
      {nodes.map((node) => {
        const character = cast.characters.find((candidate) => candidate.id === node.id);
        if (character === undefined) return null;
        return <MapCard key={node.id} addressOf={addressOf} character={character} node={node} />;
      })}
    </ul>
  );
}
