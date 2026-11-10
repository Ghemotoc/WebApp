/**
 * RelationshipMap: the web of a story's cast (story S1-E17-15; bundle G10 ATLAS, part b2, board
 * AtlasConnections).
 *
 * - Characters with at least one relationship are glass cards, joined by labelled lines
 *   (lib/relationshipMap.ts). The rest are named under the map as "Not on the map yet".
 * - Each category has its own colour and line style; the category switches double as the legend,
 *   and turning one off hides its lines.
 * - Every card is a real link to the character's sheet (or, on a readers' page, their public page
 *   while Characters is public), so it can be reached by keyboard.
 * - On the writer's map the cards can be dragged: dropped on empty map a card stays there, dropped
 *   on another card it opens "Add a connection" with both picked (useCardDrag). Readers' maps
 *   don't move.
 * - "− Fit +" zooms; the map scrolls inside its own focusable region, so the page never does.
 * - The drawing is hidden from screen readers: the same relationships are in the List view.
 * Who uses it: ConnectionsPage (through ConnectionsMapView) and PublicConnections. What it calls:
 * the layout helpers, useCardDrag, useMapZoom, MapLines, MapCards and MapZoomBar.
 */
import { useState, type ReactNode } from 'react';

import type { CharacterRelationship, MapPlace, StoryCast } from '../api/characters';
import { useCardDrag, type CardDragActions } from '../hooks/useCardDrag';
import { useMapZoom } from '../hooks/useMapZoom';
import type { RelationshipWords } from '../hooks/useRelationshipWords';
import { categoryOf, type RelationshipCategory } from '../lib/relationshipCategories';
import {
  layoutRelationshipMap,
  splitMapCast,
  type MapCardInput,
  type MapLayout,
} from '../lib/relationshipMap';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { MapCards } from './MapCards';
import { MapCategorySwitches } from './MapCategorySwitches';
import { MapLines } from './MapLines';
import { MapZoomBar } from './MapZoomBar';

/** What the map needs. */
export interface RelationshipMapProps {
  /** Where a character's card opens: their sheet, a reader page, or null for no link. */
  addressOf: (characterId: string) => string | null;
  cast: StoryCast;
  words: RelationshipWords;
  /** What a drag does; left out on a readers' map, where cards don't move. */
  dragActions?: CardDragActions;
  /** The character "Focus on" picked, or null for everyone. */
  focusId?: string | null;
  /** Places just dropped and not yet saved, so a card doesn't jump back while it saves. */
  pendingPlaces?: ReadonlyMap<string, MapPlace>;
}

/** The character in focus and everyone linked to them by a shown line, or null for everyone. */
function focusGroup(focusId: string | null, shown: CharacterRelationship[]): Set<string> | null {
  if (focusId === null) return null;
  const group = new Set([focusId]);
  for (const relationship of shown) {
    if (relationship.fromId === focusId) group.add(relationship.toId);
    if (relationship.toId === focusId) group.add(relationship.fromId);
  }
  return group;
}

/** The cards to place: each on-map character with the place the writer gave it, if any. */
function cardInputs(
  cast: StoryCast,
  onMap: string[],
  pendingPlaces: ReadonlyMap<string, MapPlace> | undefined,
): MapCardInput[] {
  return onMap.map((id) => {
    const character = cast.characters.find((candidate) => candidate.id === id);
    return { id, mapPlace: pendingPlaces?.get(id) ?? character?.mapPlace ?? null };
  });
}

/**
 * Lays out the map and its drag, redrawing the lines from the dragged card's live place.
 *
 * @returns the layout to draw, the drag handlers (or null) and the zoom controls
 */
function useMapDrawing(
  cards: MapCardInput[],
  shown: CharacterRelationship[],
  dragActions: CardDragActions | undefined,
) {
  // Step 1: where every card sits at rest, and the zoom that fits it.
  const restingLayout = layoutRelationshipMap(cards, shown);
  const zoomControls = useMapZoom(restingLayout.width);
  // Step 2: the drag works on the resting places; while a card moves, the lines follow it.
  const drag = useCardDrag(restingLayout.nodes, zoomControls.zoom, dragActions ?? null);
  const live = drag.live;
  const layout =
    live === null
      ? restingLayout
      : layoutRelationshipMap(
          cards.map((card) => (card.id === live.id ? { id: card.id, mapPlace: live } : card)),
          shown,
        );
  return { layout, drag: dragActions === undefined ? null : drag, zoomControls };
}

/** The map at its zoom: a box the scaled size of the map, with the full-size drawing inside. */
function MapCanvas({
  layout,
  zoom,
  words,
  focusId,
  cards,
}: {
  layout: MapLayout;
  zoom: number;
  words: RelationshipWords;
  focusId: string | null;
  cards: ReactNode;
}) {
  return (
    <div
      className="relative mx-auto"
      style={{ width: layout.width * zoom, height: layout.height * zoom }}
    >
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{ width: layout.width, height: layout.height, transform: `scale(${zoom})` }}
      >
        <MapLines layout={layout} words={words} focusId={focusId} />
        {cards}
      </div>
    </div>
  );
}

/**
 * Renders the switches, the zooming map and the characters not on it.
 *
 * @returns the map's whole block
 */
export function RelationshipMap({
  addressOf,
  cast,
  words,
  dragActions,
  focusId = null,
  pendingPlaces,
}: RelationshipMapProps) {
  const { t } = useAtlasTranslation();
  const [hiddenCategories, setHiddenCategories] = useState<RelationshipCategory[]>([]);
  // Step 1: the lines whose category is switched on. Every relationship decides who is on the
  // map, so cards don't come and go with the switches.
  const shown = cast.relationships.filter(
    (relationship) => !hiddenCategories.includes(categoryOf(relationship.kind)),
  );
  const { onMap, offMap } = splitMapCast(
    cast.characters.map((character) => character.id),
    cast.relationships,
  );
  const cards = cardInputs(cast, onMap, pendingPlaces);
  const { layout, drag, zoomControls } = useMapDrawing(cards, shown, dragActions);
  const { zoom, regionRef } = zoomControls;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <MapCategorySwitches hiddenCategories={hiddenCategories} onChange={setHiddenCategories} />
      {onMap.length === 0 && <p className="m-0 text-body">{t('connections.map.none')}</p>}
      {/* Step 2: the map scrolls inside its own region; the region can be focused and scrolled
          by keyboard (DoD: a sideways list without arrows keeps its scrollbar). */}
      <div
        ref={regionRef}
        role="region"
        aria-label={t('connections.map.region')}
        tabIndex={0}
        className="max-w-full overflow-auto rounded-card border border-hairline"
        data-testid="atlas-relationship-map"
      >
        <MapCanvas
          layout={layout}
          zoom={zoom}
          words={words}
          focusId={focusId}
          cards={
            <MapCards
              addressOf={addressOf}
              cast={cast}
              nodes={layout.nodes}
              drag={drag}
              inFocus={focusGroup(focusId, shown)}
            />
          }
        />
      </div>
      {onMap.length > 0 && <MapZoomBar zoomControls={zoomControls} />}
      {onMap.length > 0 && offMap.length > 0 && (
        <p className="m-0 text-sm text-meta">
          {t('connections.map.offMap', { names: offMap.map((id) => words.nameOf(id)).join(', ') })}
        </p>
      )}
    </div>
  );
}
