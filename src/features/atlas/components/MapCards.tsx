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
 * Who uses it: RelationshipMap. What it calls: MaybeLink.
 */
import type { StoryCast, StoryCharacter } from '../api/characters';
import { cardHeight, cardWidth, type MapNode } from '../lib/relationshipMap';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { MaybeLink } from './MaybeLink';

/** What the cards need. */
export interface MapCardsProps {
  addressOf: (characterId: string) => string | null;
  cast: StoryCast;
  nodes: MapNode[];
}

/** A year on its own, such as "1951", which reads as "b. 1951". */
const yearOnly = /^\d{4}$/;

/**
 * The words under a card's name: the year born or the age, then the role for the protagonist or
 * the occupation, else the character in a line.
 *
 * @returns the facts joined by a middot, or an empty string
 */
function useCardMeta(character: StoryCharacter): string {
  const { t } = useAtlasTranslation();
  const facts: string[] = [];
  // Step 1: the year born ("b. 1951") or what the writer wrote there ("13", "1956–1974").
  const born = (character.sheet.age_or_born ?? '').trim();
  if (born !== '') {
    facts.push(yearOnly.test(born) ? t('connections.map.born', { year: born }) : born);
  }
  // Step 2: the protagonist says so beside the ring; others their work or their line.
  const occupation = (character.sheet.occupation ?? '').trim();
  const summary = (character.sheet.summary ?? '').trim();
  if (character.role === 'protagonist') facts.push(t('characters.role.protagonist').toLowerCase());
  else if (occupation !== '') facts.push(occupation);
  else if (summary !== '') facts.push(summary);
  return facts.join(' · ');
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
  const meta = useCardMeta(character);
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
