/**
 * useBoardDrag: dragging a card on the chapter board (CALM-9, board E28: "the card lifts and
 * follows the pointer; its old place shows a faint outline; the act column under it gets a ring;
 * a dashed gap saying 'Becomes chapter N' opens where it will land. Press and hold starts the
 * drag on touch").
 *
 * Built on dnd-kit (the same library as the chapter list in S1-E3-04). A mouse drag starts after a
 * 4 px move, so a click on the title or the menu still works; on a touch screen the card has to
 * be held for a quarter of a second, so a swipe still scrolls the page. Dragging is for a pointer
 * only: the card's "…" menu does every move by keyboard (WCAG 2.5.7), so there is no keyboard
 * sensor and dnd-kit's own English announcements are switched off; the board says "Becomes
 * chapter N" itself, in the interface language, in a polite live region.
 * Who calls it: ChapterBoard. What it calls: dnd-kit and lib/boardDrag.ts.
 */
import {
  MeasuringStrategy,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useState } from 'react';

import type { Storyline } from '../api/storyline';
import type { BoardTarget } from '../lib/boardColumns';
import { changesNothing, dropTarget, landingGapDropId } from '../lib/boardDrag';

/**
 * Picks the drop zone under the pointer, a card or the landing gap before its column, so a card
 * held over another card lands next to it rather than at the column's end.
 */
const cardsFirst: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  const isInColumn = (id: string) => id.startsWith('card:') || id === landingGapDropId;
  const innerHits = hits.filter((hit) => isInColumn(String(hit.id)));
  return innerHits.length > 0 ? innerHits : hits;
};

/** Where the pointer (or finger) is now, top to bottom: where the drag started plus how far it went. */
function pointerTop(event: DragMoveEvent): number | null {
  const start = event.activatorEvent;
  if (start instanceof MouseEvent) return start.clientY + event.delta.y;
  if (typeof TouchEvent !== 'undefined' && start instanceof TouchEvent) {
    const touch = start.touches[0];
    return touch === undefined ? null : touch.clientY + event.delta.y;
  }
  return null;
}

/** Whether the pointer is in the lower half of the drop zone it is over. */
function isInLowerHalf(event: DragMoveEvent): boolean {
  const top = pointerTop(event);
  const over = event.over?.rect;
  if (top === null || over === undefined) return false;
  return top > over.top + over.height / 2;
}

/** dnd-kit's spoken messages, all left out: the board's own live region speaks instead. */
const silentAnnouncements = {
  onDragStart: () => undefined,
  onDragMove: () => undefined,
  onDragOver: () => undefined,
  onDragEnd: () => undefined,
  onDragCancel: () => undefined,
};

/**
 * Keeps track of one drag.
 *
 * @param storyline - the chapters and acts the board shows
 * @param move - saves a move (ChapterBoard's, which also asks first for published chapters)
 * @returns the DndContext props (sensors, collision rule, handlers, accessibility), the card
 *   being dragged and where it would land (null while it would change nothing)
 */
export function useBoardDrag(
  storyline: Storyline,
  move: (code: string, target: BoardTarget) => void,
) {
  const [draggedCode, setDraggedCode] = useState<string | null>(null);
  const [target, setTarget] = useState<BoardTarget | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );

  /** Works out the landing place from what the pointer is over; nothing when it changes nothing. */
  function placeFor(event: DragMoveEvent | DragEndEvent): BoardTarget | null {
    const code = String(event.active.id);
    if (event.over === null) return null;
    // Over the gap itself, the place stays the one the gap already shows.
    if (String(event.over.id) === landingGapDropId) return target;
    const place = dropTarget({
      chapters: storyline.chapters,
      acts: storyline.acts,
      draggedCode: code,
      overId: String(event.over.id),
      isLowerHalf: isInLowerHalf(event),
    });
    if (place === null) return null;
    return changesNothing(storyline.chapters, storyline.acts, code, place) ? null : place;
  }

  /** Clears the drag, whether it was dropped or cancelled. */
  function finish() {
    setDraggedCode(null);
    setTarget(null);
  }

  return {
    draggedCode,
    target,
    contextProps: {
      sensors,
      collisionDetection: cardsFirst,
      // The gap moves the cards below it, so the drop zones are measured again as the board
      // changes during a drag, not only when it starts.
      measuring: { droppable: { strategy: MeasuringStrategy.Always } },
      accessibility: { announcements: silentAnnouncements },
      onDragStart: (event: DragStartEvent) => setDraggedCode(String(event.active.id)),
      onDragMove: (event: DragMoveEvent) => {
        // Only a different place re-draws the board, not every pixel of the drag.
        const place = placeFor(event);
        setTarget((current) => {
          const isSame = current?.actId === place?.actId && current?.index === place?.index;
          return isSame ? current : place;
        });
      },
      onDragEnd: (event: DragEndEvent) => {
        const place = placeFor(event);
        finish();
        if (place !== null) move(String(event.active.id), place);
      },
      onDragCancel: finish,
    },
  };
}
