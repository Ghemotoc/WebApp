/**
 * Where the relationship map draws each character and each line (story S1-E17-15: "characters
 * show as nodes and relationships as labelled lines").
 *
 * The characters sit on a circle, in the cast's name order, so every line can be seen. Two
 * characters with more than one relationship get curved lines that bend apart, so each line and
 * its label stay readable. Who calls it: RelationshipMap. What it calls: nothing.
 */
import type { CharacterRelationship } from '../api/characters';

/** The radius of a node's circle; lines stop just short of it so the arrows show. */
export const nodeRadius = 28;

/** One character's place on the map. */
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

/** The whole map: its width and height (a square), the nodes and the lines. */
export interface MapLayout {
  size: number;
  nodes: MapNode[];
  edges: MapEdge[];
}

/** Rounds to one decimal, so the drawing's numbers stay short. */
function round(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Puts the characters on a circle big enough for their names.
 *
 * @param characterIds - the characters, in the order they go round
 * @returns the map's size and each node's centre
 */
function placeNodes(characterIds: string[]): { size: number; nodes: MapNode[] } {
  const radius = Math.max(200, characterIds.length * 40);
  // Room around the circle for the names under the nodes and the line labels.
  const size = 2 * radius + 200;
  const centre = size / 2;
  const nodes = characterIds.map((id, index) => {
    // The first character at the top, then clockwise.
    const angle = -Math.PI / 2 + (2 * Math.PI * index) / characterIds.length;
    const onCircle = characterIds.length === 1 ? 0 : radius;
    return {
      id,
      x: round(centre + onCircle * Math.cos(angle)),
      y: round(centre + onCircle * Math.sin(angle)),
    };
  });
  return { size, nodes };
}

/**
 * One line from a node to another, bent sideways by `bend` pixels at its middle.
 *
 * @param from - where it starts
 * @param to - where it ends (the arrow's end)
 * @param bend - how far the middle moves to the side; 0 is straight
 * @returns the SVG path and the label's place
 */
function curve(from: MapNode, to: MapNode, bend: number): Omit<MapEdge, 'relationship'> {
  // Step 1: the direction from one centre to the other, and the side direction.
  const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  const along = { x: (to.x - from.x) / length, y: (to.y - from.y) / length };
  const side = { x: -along.y, y: along.x };
  // Step 2: start and end at the circles' edges, a little further at the arrow's end.
  const start = { x: from.x + along.x * (nodeRadius + 2), y: from.y + along.y * (nodeRadius + 2) };
  const end = { x: to.x - along.x * (nodeRadius + 8), y: to.y - along.y * (nodeRadius + 8) };
  // Step 3: a quadratic curve whose middle sits `bend` to the side (its control point is twice
  // as far), with the label on that middle.
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
 * Lays out the map.
 *
 * @param characterIds - every character, in name order
 * @param relationships - the relationships to draw (the switched-off categories already left out)
 * @returns the size, nodes and lines
 */
export function layoutRelationshipMap(
  characterIds: string[],
  relationships: CharacterRelationship[],
): MapLayout {
  const { size, nodes } = placeNodes(characterIds);
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  // Step 1: the relationships between each pair, so lines between the same two bend apart.
  const pairs = new Map<string, CharacterRelationship[]>();
  for (const relationship of relationships) {
    const key = pairKey(relationship);
    pairs.set(key, [...(pairs.get(key) ?? []), relationship]);
  }
  // Step 2: one curve per relationship, spread around the straight line.
  const edges: MapEdge[] = [];
  for (const group of pairs.values()) {
    group.forEach((relationship, index) => {
      const from = nodeById.get(relationship.fromId);
      const to = nodeById.get(relationship.toId);
      if (from === undefined || to === undefined) return;
      // Measured on the pair's own sorted direction, so opposite lines still bend apart.
      const sameWay = [relationship.fromId, relationship.toId].sort()[0] === relationship.fromId;
      const spread = (index - (group.length - 1) / 2) * 46;
      edges.push({ relationship, ...curve(from, to, sameWay ? spread : -spread) });
    });
  }
  return { size, nodes, edges };
}
