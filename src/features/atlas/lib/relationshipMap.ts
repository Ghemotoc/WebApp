/**
 * Where the relationship map draws each card and each line (story S1-E17-15; user stories bundle
 * 6, story 6.6, board E25: "the map places people by family and circle").
 *
 * - Only characters with at least one relationship get a card; the rest are "Not on the map yet".
 * - Family first, on the left, one row per generation: parents a row above their children,
 *   partners, siblings and cousins on the same row (the family category of relationshipCategories).
 * - Then the circle, on the right: everyone else, on the row of the people they are linked to, so
 *   a friend of the youngest sits beside the youngest (board E25: Teo Stan beside Mara Rus).
 * - With no family at all, the circle fills rows of four.
 * - Lines run from card centre to card centre, under the cards. Two characters with more than one
 *   relationship get curved lines that bend apart, so each one can be seen.
 * Who calls it: RelationshipMap. What it calls: categoryOf.
 */
import type { CharacterRelationship } from '../api/characters';

import { categoryOf } from './relationshipCategories';

/** A card's size on the map, in map pixels (board E25's .mapnode: 15/18 name and meta, 8 px). */
export const cardWidth = 160;
export const cardHeight = 52;
/** The step from one column to the next and one row to the next, and the room round the edge. */
const columnStep = 190;
const rowStep = 130;
const margin = 20;
/** How many cards a row holds when nobody on the map is family. */
const circleOnlyColumns = 4;

/** One card's top-left corner on the map. */
export interface MapNode {
  id: string;
  x: number;
  y: number;
}

/** One relationship's line. */
export interface MapEdge {
  relationship: CharacterRelationship;
  path: string;
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

/** How a family relationship moves a generation: a parent's child is one row lower. */
function generationStep(relationship: CharacterRelationship): number {
  return relationship.kind === 'parent_of' ? 1 : 0;
}

/** The other end of a relationship from one character, or null when it doesn't touch them. */
function otherEnd(link: CharacterRelationship, id: string): string | null {
  if (link.fromId === id) return link.toId;
  if (link.toId === id) return link.fromId;
  return null;
}

/**
 * Walks one family from its first member: a row down for a child, a row up for a parent.
 *
 * @param start - the first member met
 * @param family - the family relationships only
 * @returns each member's row, relative to the first, in the order they were met
 */
function walkFamily(start: string, family: CharacterRelationship[]): Map<string, number> {
  const found = new Map<string, number>([[start, 0]]);
  const queue = [start];
  while (queue.length > 0) {
    const id = queue.shift() as string;
    const row = found.get(id) as number;
    for (const link of family) {
      const next = otherEnd(link, id);
      if (next === null || found.has(next)) continue;
      // A parent's child is one row lower; seen from the child, the parent is one row higher.
      const step = generationStep(link);
      found.set(next, link.fromId === id ? row + step : row - step);
      queue.push(next);
    }
  }
  return found;
}

/**
 * Each family member's generation, counted from the oldest in their own family (0 at the top).
 *
 * @param ids - the characters on the map, in the cast's order
 * @param family - the family relationships only
 * @returns each family member's row and the order they were met in (partners side by side)
 */
function familyGenerations(
  ids: string[],
  family: CharacterRelationship[],
): { rows: Map<string, number>; order: string[] } {
  const rows = new Map<string, number>();
  const order: string[] = [];
  const inFamily = ids.filter((id) => family.some((link) => otherEnd(link, id) !== null));
  for (const start of inFamily) {
    if (rows.has(start)) continue;
    // Each family's oldest generation becomes row 0.
    const found = walkFamily(start, family);
    const top = Math.min(...found.values());
    for (const [id, row] of found) {
      rows.set(id, row - top);
      order.push(id);
    }
  }
  return { rows, order };
}

/**
 * The circle's rows: each person on the rounded average row of those they link to who already
 * have one, met in waves out from the family, so friends of friends follow too.
 *
 * @returns each circle member's row
 */
function circleRows(
  circle: string[],
  relationships: CharacterRelationship[],
  rows: Map<string, number>,
): Map<string, number> {
  const placed = new Map(rows);
  let waiting = [...circle];
  while (waiting.length > 0) {
    const stillWaiting: string[] = [];
    for (const id of waiting) {
      const linkedRows = relationships
        .map((link) => otherEnd(link, id))
        .map((other) => (other === null ? undefined : placed.get(other)))
        .filter((row): row is number => row !== undefined);
      if (linkedRows.length === 0) stillWaiting.push(id);
      else placed.set(id, Math.round(linkedRows.reduce((a, b) => a + b, 0) / linkedRows.length));
    }
    // Nobody new found a row this wave: the first left over starts on the top row.
    if (stillWaiting.length === waiting.length) placed.set(stillWaiting.shift() as string, 0);
    waiting = stillWaiting;
  }
  for (const id of rows.keys()) placed.delete(id);
  return placed;
}

/**
 * Where every card sits: family on the left by generation, the circle to its right.
 *
 * @param ids - the characters on the map, in the cast's order
 * @param relationships - every relationship (the hidden categories too, so cards stay put)
 * @returns each card's top-left corner
 */
function placeCards(ids: string[], relationships: CharacterRelationship[]): MapNode[] {
  const family = relationships.filter((link) => categoryOf(link.kind) === 'family');
  const { rows, order } = familyGenerations(ids, family);
  const circle = ids.filter((id) => !rows.has(id));
  // Step 1: no family at all, so the circle fills rows of four in the cast's order.
  if (rows.size === 0) {
    return circle.map((id, index) => ({
      id,
      x: margin + (index % circleOnlyColumns) * columnStep,
      y: margin + Math.floor(index / circleOnlyColumns) * rowStep,
    }));
  }
  // Step 2: each family row in the order its people were met; the widest row sets the circle's start.
  const columnsUsed = new Map<number, number>();
  const nodes: MapNode[] = [];
  const put = (id: string, row: number, column: number) =>
    nodes.push({ id, x: margin + column * columnStep, y: margin + row * rowStep });
  for (const id of order) {
    const row = rows.get(id) as number;
    const column = columnsUsed.get(row) ?? 0;
    put(id, row, column);
    columnsUsed.set(row, column + 1);
  }
  const familyWidth = Math.max(...columnsUsed.values());
  // Step 3: the circle on the right, each on the row of the people they are linked to.
  const circleColumns = new Map<number, number>();
  for (const [id, row] of circleRows(circle, relationships, rows)) {
    const column = circleColumns.get(row) ?? 0;
    put(id, row, familyWidth + column);
    circleColumns.set(row, column + 1);
  }
  return nodes;
}

/** The same key for both directions between two characters. */
function pairKey(relationship: CharacterRelationship): string {
  return [relationship.fromId, relationship.toId].sort().join('|');
}

/**
 * One line from a card's centre to another's, bent sideways by `bend` pixels at its middle.
 *
 * @returns the SVG path
 */
function line(from: MapNode, to: MapNode, bend: number): string {
  const start = { x: from.x + cardWidth / 2, y: from.y + cardHeight / 2 };
  const end = { x: to.x + cardWidth / 2, y: to.y + cardHeight / 2 };
  const length = Math.hypot(end.x - start.x, end.y - start.y) || 1;
  // The side direction, at right angles to the line, for the bend.
  const side = { x: -(end.y - start.y) / length, y: (end.x - start.x) / length };
  const control = {
    x: (start.x + end.x) / 2 + side.x * bend * 2,
    y: (start.y + end.y) / 2 + side.y * bend * 2,
  };
  return `M ${round(start.x)} ${round(start.y)} Q ${round(control.x)} ${round(control.y)} ${round(end.x)} ${round(end.y)}`;
}

/**
 * One line per relationship, spread apart when two characters have several.
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
  // bend apart; a pair's only line is straight.
  const edges: MapEdge[] = [];
  for (const group of pairs.values()) {
    group.forEach((relationship, index) => {
      const from = nodeById.get(relationship.fromId);
      const to = nodeById.get(relationship.toId);
      if (from === undefined || to === undefined) return;
      const sameWay = [relationship.fromId, relationship.toId].sort()[0] === relationship.fromId;
      const spread = (index - (group.length - 1) / 2) * 24;
      edges.push({ relationship, path: line(from, to, sameWay ? spread : -spread) });
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
 * @param ids - the characters on the map, in the cast's order
 * @param relationships - every relationship, which places the cards
 * @param shown - the lines to draw (switched-off categories already left out)
 * @returns the size, cards and lines
 */
export function layoutRelationshipMap(
  ids: string[],
  relationships: CharacterRelationship[],
  shown: CharacterRelationship[],
): MapLayout {
  const nodes = placeCards(ids, relationships);
  // Big enough for every card, with room round the edge.
  const width = Math.max(
    cardWidth + 2 * margin,
    ...nodes.map((node) => node.x + cardWidth + margin),
  );
  const height = Math.max(
    cardHeight + 2 * margin,
    ...nodes.map((node) => node.y + cardHeight + margin),
  );
  return { width, height, nodes, edges: edgesFor(nodes, shown) };
}
