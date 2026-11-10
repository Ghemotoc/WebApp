/**
 * Where the relationship map draws each card and each line (story S1-E17-15: "characters show as
 * nodes and relationships as labelled lines"; bundle G10 ATLAS, part b2, board AtlasConnections).
 *
 * - Only characters with at least one relationship get a card; the rest are "Not on the map yet".
 * - A card the writer moved stays where they dropped it (MapPlace); the others sit on a circle,
 *   in the cast's name order, so every line can be seen.
 * - Lines stop at the cards' edges. Two characters with more than one relationship get curved
 *   lines that bend apart, so each line and its label stay readable.
 * Who calls it: RelationshipMap and useCardDrag. What it calls: nothing.
 */
import type { CharacterRelationship, MapPlace } from '../api/characters';

/** A card's size on the map, in map pixels. */
export const cardWidth = 150;
export const cardHeight = 120;
/** The room left round the cards, and the largest place the database keeps (4,000). */
const margin = 40;
const largestPlace = 4000;

/** One card going onto the map: the character and where the writer put it, if anywhere. */
export interface MapCardInput {
  id: string;
  mapPlace: MapPlace | null;
}

/** One card's top-left corner on the map. */
export interface MapNode {
  id: string;
  x: number;
  y: number;
}

/** One relationship's line: its curve and where its label sits. */
export interface MapEdge {
  relationship: CharacterRelationship;
  path: string;
  labelX: number;
  labelY: number;
}

/** The whole map: its size, the cards and the lines. */
export interface MapLayout {
  width: number;
  height: number;
  nodes: MapNode[];
  edges: MapEdge[];
}

/** Rounds to one decimal, so the drawing's numbers stay short. */
function round(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Keeps a place inside the map the database allows (0 to 4,000 each way).
 *
 * @param place - where a card was dropped
 * @returns the same place, pulled inside the edges
 */
export function clampPlace(place: MapPlace): MapPlace {
  return {
    x: Math.round(Math.min(Math.max(place.x, 0), largestPlace)),
    y: Math.round(Math.min(Math.max(place.y, 0), largestPlace)),
  };
}

/**
 * The places the map gives cards the writer hasn't moved: round a circle big enough for them.
 *
 * @param ids - the cards, in the order they go round
 * @returns each card's top-left corner
 */
function circlePlaces(ids: string[]): Map<string, MapPlace> {
  const radius = ids.length <= 1 ? 0 : Math.max(220, ids.length * 52);
  const centre = { x: margin + radius + cardWidth / 2, y: margin + radius + cardHeight / 2 };
  const places = new Map<string, MapPlace>();
  ids.forEach((id, index) => {
    // The first card at the top, then clockwise.
    const angle = -Math.PI / 2 + (2 * Math.PI * index) / Math.max(ids.length, 1);
    places.set(id, {
      x: round(centre.x + radius * Math.cos(angle) - cardWidth / 2),
      y: round(centre.y + radius * Math.sin(angle) - cardHeight / 2),
    });
  });
  return places;
}

/**
 * How far from a card's centre a line leaves its edge, going in one direction.
 *
 * @param along - the line's direction, as a unit vector
 * @returns the distance from the centre to the card's edge
 */
function toEdge(along: MapPlace): number {
  const across = along.x === 0 ? Infinity : cardWidth / 2 / Math.abs(along.x);
  const down = along.y === 0 ? Infinity : cardHeight / 2 / Math.abs(along.y);
  return Math.min(across, down);
}

/**
 * One line from a card to another, bent sideways by `bend` pixels at its middle.
 *
 * @param from - where it starts (a card's top-left corner)
 * @param to - where it ends, at the arrow
 * @param bend - how far the middle moves to the side; 0 is straight
 * @returns the SVG path and the label's place
 */
function curve(from: MapNode, to: MapNode, bend: number): Omit<MapEdge, 'relationship'> {
  // Step 1: the cards' centres, the direction from one to the other, and the side direction.
  const fromCentre = { x: from.x + cardWidth / 2, y: from.y + cardHeight / 2 };
  const toCentre = { x: to.x + cardWidth / 2, y: to.y + cardHeight / 2 };
  const length = Math.hypot(toCentre.x - fromCentre.x, toCentre.y - fromCentre.y) || 1;
  const along = {
    x: (toCentre.x - fromCentre.x) / length,
    y: (toCentre.y - fromCentre.y) / length,
  };
  const side = { x: -along.y, y: along.x };
  // Step 2: start and end at the cards' edges, a little further out at the arrow's end.
  const edge = toEdge(along);
  const start = { x: fromCentre.x + along.x * (edge + 2), y: fromCentre.y + along.y * (edge + 2) };
  const end = { x: toCentre.x - along.x * (edge + 8), y: toCentre.y - along.y * (edge + 8) };
  // Step 3: a quadratic curve whose middle sits `bend` to the side, with the label there.
  const middle = {
    x: (start.x + end.x) / 2 + side.x * bend,
    y: (start.y + end.y) / 2 + side.y * bend,
  };
  const control = { x: middle.x + side.x * bend, y: middle.y + side.y * bend };
  return {
    path: `M ${round(start.x)} ${round(start.y)} Q ${round(control.x)} ${round(control.y)} ${round(end.x)} ${round(end.y)}`,
    labelX: round(middle.x),
    labelY: round(middle.y),
  };
}

/** The same key for both directions between two characters. */
function pairKey(relationship: CharacterRelationship): string {
  return [relationship.fromId, relationship.toId].sort().join('|');
}

/**
 * One curve per relationship, spread apart when two characters have several.
 *
 * @returns the lines between cards that are both on the map
 */
function edgesFor(nodes: MapNode[], relationships: CharacterRelationship[]): MapEdge[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  // Step 1: the relationships between each pair, so lines between the same two bend apart.
  const pairs = new Map<string, CharacterRelationship[]>();
  for (const relationship of relationships) {
    const key = pairKey(relationship);
    pairs.set(key, [...(pairs.get(key) ?? []), relationship]);
  }
  // Step 2: each line, measured on the pair's own sorted direction, so opposite lines still
  // bend apart.
  const edges: MapEdge[] = [];
  for (const group of pairs.values()) {
    group.forEach((relationship, index) => {
      const from = nodeById.get(relationship.fromId);
      const to = nodeById.get(relationship.toId);
      if (from === undefined || to === undefined) return;
      const sameWay = [relationship.fromId, relationship.toId].sort()[0] === relationship.fromId;
      const spread = (index - (group.length - 1) / 2) * 46;
      edges.push({ relationship, ...curve(from, to, sameWay ? spread : -spread) });
    });
  }
  return edges;
}

/**
 * The characters that go on the map: those in at least one relationship, in the cast's order.
 *
 * @param characterIds - every character, in name order
 * @param relationships - every relationship (switched-off categories included, so cards don't
 *   come and go with the switches)
 * @returns the IDs on the map and the IDs "Not on the map yet"
 */
export function splitMapCast(
  characterIds: string[],
  relationships: CharacterRelationship[],
): { onMap: string[]; offMap: string[] } {
  const linked = new Set(relationships.flatMap((link) => [link.fromId, link.toId]));
  return {
    onMap: characterIds.filter((id) => linked.has(id)),
    offMap: characterIds.filter((id) => !linked.has(id)),
  };
}

/**
 * Lays out the map.
 *
 * @param cards - the characters on the map, in name order, with any place the writer chose
 * @param relationships - the lines to draw (switched-off categories already left out)
 * @returns the size, cards and lines
 */
export function layoutRelationshipMap(
  cards: MapCardInput[],
  relationships: CharacterRelationship[],
): MapLayout {
  // Step 1: a place for every card: the writer's, or one round the circle.
  const circle = circlePlaces(cards.map((card) => card.id));
  const nodes = cards.map((card) => ({
    id: card.id,
    ...(card.mapPlace ?? circle.get(card.id) ?? { x: margin, y: margin }),
  }));
  // Step 2: big enough for every card, with room round the edge.
  const width = Math.max(
    cardWidth + 2 * margin,
    ...nodes.map((node) => node.x + cardWidth + margin),
  );
  const height = Math.max(
    cardHeight + 2 * margin,
    ...nodes.map((node) => node.y + cardHeight + margin),
  );
  return { width, height, nodes, edges: edgesFor(nodes, relationships) };
}

/**
 * The card a dragged card was dropped onto: the one whose box holds the dragged card's centre.
 *
 * @param nodes - the cards where they are now
 * @param draggedId - the card being dragged
 * @param place - where the dragged card was let go (top-left corner)
 * @returns the other card's ID, or null when it landed on empty map
 */
export function cardUnder(nodes: MapNode[], draggedId: string, place: MapPlace): string | null {
  const centre = { x: place.x + cardWidth / 2, y: place.y + cardHeight / 2 };
  const target = nodes.find(
    (node) =>
      node.id !== draggedId &&
      centre.x >= node.x &&
      centre.x <= node.x + cardWidth &&
      centre.y >= node.y &&
      centre.y <= node.y + cardHeight,
  );
  return target?.id ?? null;
}

/** The zoom steps the − and + buttons move through. */
export const zoomLevels = [0.4, 0.6, 0.8, 1, 1.2, 1.4] as const;

/**
 * The zoom that fits the whole map into a region's width, never larger than full size.
 *
 * @param mapWidth - the map's width at full size
 * @param regionWidth - the room the region has
 * @returns a zoom between 0.4 and 1
 */
export function fitZoom(mapWidth: number, regionWidth: number): number {
  if (mapWidth <= 0 || regionWidth <= 0) return 1;
  return Math.min(1, Math.max(zoomLevels[0], regionWidth / mapWidth));
}
