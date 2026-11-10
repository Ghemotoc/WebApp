/**
 * useCardDrag: dragging cards on the relationship map (bundle G10 ATLAS, part b2; board
 * AtlasConnections: "Drag a card to move it. Drag one card onto another to connect them.").
 *
 * A card follows the pointer once it has moved a few pixels, so a plain click still opens the
 * sheet. When it is let go on empty map the new place is saved; let go on another card, it springs
 * back and the "Add a connection" form opens with both characters picked. The click that ends a
 * drag is swallowed, so dropping a card never opens its sheet. Mouse, pen and touch all work
 * (pointer events). The button alternatives are "Arrange for me" and "Add a connection" (DoD:
 * dragging has a button alternative).
 * Who calls it: RelationshipMap. What it calls: the onMove and onConnect props, and
 * cardUnder() and clampPlace() in lib/relationshipMap.ts.
 */
import { useRef, useState, type PointerEvent } from 'react';

import type { MapPlace } from '../api/characters';
import { cardUnder, clampPlace, type MapNode } from '../lib/relationshipMap';

/** How far a pointer moves, in screen pixels, before a press becomes a drag. */
const dragThreshold = 5;

/** What the map does when a drag ends. */
export interface CardDragActions {
  /** Saves a card's new place. */
  onMove: (characterId: string, place: MapPlace) => void;
  /** Opens "Add a connection" from one card to the other. */
  onConnect: (fromId: string, toId: string) => void;
}

/** One drag in progress: which card, where it started and how far it has gone. */
interface DragState {
  id: string;
  start: MapPlace;
  pointer: MapPlace;
  offset: MapPlace;
  isMoving: boolean;
}

/**
 * The drag handlers for the map's cards.
 *
 * @param nodes - the cards where they are now
 * @param zoom - the map's zoom, so a pointer move becomes the right distance on the map
 * @param actions - what to do when a drag ends; null on a readers' map, where nothing moves
 * @returns the card being dragged and its live place, and the handlers to put on each card
 */
export function useCardDrag(nodes: MapNode[], zoom: number, actions: CardDragActions | null) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const justDragged = useRef(false);

  /** The press: remembers the card and where the pointer was. */
  function onPointerDown(node: MapNode, event: PointerEvent<HTMLElement>) {
    if (actions === null || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({
      id: node.id,
      start: { x: node.x, y: node.y },
      pointer: { x: event.clientX, y: event.clientY },
      offset: { x: 0, y: 0 },
      isMoving: false,
    });
  }

  /** The move: past the threshold, the card follows the pointer. */
  function onPointerMove(event: PointerEvent<HTMLElement>) {
    if (drag === null) return;
    const moved = { x: event.clientX - drag.pointer.x, y: event.clientY - drag.pointer.y };
    const isMoving = drag.isMoving || Math.hypot(moved.x, moved.y) > dragThreshold;
    setDrag({ ...drag, isMoving, offset: { x: moved.x / zoom, y: moved.y / zoom } });
  }

  /** The release: a connection when it lands on a card, otherwise a new place. */
  function onPointerUp() {
    if (drag === null || actions === null) return;
    setDrag(null);
    if (!drag.isMoving) return;
    justDragged.current = true;
    const place = clampPlace({ x: drag.start.x + drag.offset.x, y: drag.start.y + drag.offset.y });
    const target = cardUnder(nodes, drag.id, place);
    if (target === null) actions.onMove(drag.id, place);
    else actions.onConnect(drag.id, target);
  }

  /** Swallows the click that ends a drag, so the card's link doesn't open. */
  function onClickCapture(event: { preventDefault: () => void; stopPropagation: () => void }) {
    if (!justDragged.current) return;
    justDragged.current = false;
    event.preventDefault();
    event.stopPropagation();
  }

  /** Where the dragged card is drawn right now, or null when nothing is being dragged. */
  const live =
    drag !== null && drag.isMoving
      ? { id: drag.id, x: drag.start.x + drag.offset.x, y: drag.start.y + drag.offset.y }
      : null;

  return { live, onPointerDown, onPointerMove, onPointerUp, onClickCapture };
}
