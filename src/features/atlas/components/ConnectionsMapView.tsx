/**
 * ConnectionsMapView: the writer's relationship map on the Connections page (bundle G10 ATLAS,
 * part b2; board AtlasConnections).
 *
 * Above the map: "Focus on" (fades everyone not linked to the chosen character), the drag hint
 * and "Arrange for me", which puts every moved card back round the circle. A dropped card shows
 * in its new place straight away and is saved; if the save fails it goes back and a plain
 * message says so. Dropping a card on another opens "Add a connection" with both picked (the
 * onConnect prop). The buttons are the alternatives to dragging (DoD: dragging has a button
 * alternative): Arrange for me, and Add a connection above the views.
 * Who uses it: ConnectionsPage. What it calls: useRelationshipChangers (move, arrange) and
 * RelationshipMap.
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Select } from '@/components/ui/Select';

import type { MapPlace, StoryCast } from '../api/characters';
import { useRelationshipChangers } from '../hooks/useRelationshipChangers';
import type { RelationshipWords } from '../hooks/useRelationshipWords';
import { splitMapCast } from '../lib/relationshipMap';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { RelationshipMap } from './RelationshipMap';

/** What the view needs. */
export interface ConnectionsMapViewProps {
  slug: string;
  cast: StoryCast;
  words: RelationshipWords;
  addressOf: (characterId: string) => string | null;
  /** Opens "Add a connection" with both characters picked. */
  onConnect: (fromId: string, toId: string) => void;
}

/**
 * Places dropped but not yet back from the database, kept for the cast they were dropped on: once
 * a fresh cast arrives it carries the saved places, so these are no longer needed.
 */
function usePendingPlaces(cast: StoryCast) {
  const [pending, setPending] = useState<{ cast: StoryCast; places: Map<string, MapPlace> }>({
    cast,
    places: new Map(),
  });
  const places = pending.cast === cast ? pending.places : new Map<string, MapPlace>();
  return {
    places,
    add: (id: string, place: MapPlace) =>
      setPending({ cast, places: new Map(places).set(id, place) }),
    forget: (id: string) => {
      const kept = new Map(places);
      kept.delete(id);
      setPending({ cast, places: kept });
    },
  };
}

/**
 * Renders the toolbar and the map.
 *
 * @returns the map view
 */
export function ConnectionsMapView({
  slug,
  cast,
  words,
  addressOf,
  onConnect,
}: ConnectionsMapViewProps) {
  const { t } = useAtlasTranslation();
  const { move, arrange } = useRelationshipChangers(slug);
  const [focusId, setFocusId] = useState('');
  const [failure, setFailure] = useState<string | null>(null);
  const pending = usePendingPlaces(cast);
  const { onMap } = splitMapCast(
    cast.characters.map((character) => character.id),
    cast.relationships,
  );
  const hasMovedCards = cast.characters.some((character) => character.mapPlace !== null);

  /** Shows the card in its new place at once, then saves it; on failure it goes back. */
  function onMove(characterId: string, place: MapPlace) {
    setFailure(null);
    pending.add(characterId, place);
    move(characterId, place).catch(() => {
      pending.forget(characterId);
      setFailure(t('connections.map.moveFailed'));
    });
  }

  /** "Arrange for me": every card back round the circle. */
  function onArrange() {
    setFailure(null);
    arrange().catch(() => setFailure(t('connections.map.arrangeFailed')));
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Select
          id="atlas-map-focus"
          label={t('connections.map.focusOn')}
          isLabelVisible
          options={[
            { value: '', label: t('connections.map.everyone') },
            ...onMap.map((id) => ({ value: id, label: words.nameOf(id) })),
          ]}
          value={focusId}
          onChange={setFocusId}
        />
        <Button type="button" variant="secondary" disabled={!hasMovedCards} onClick={onArrange}>
          {t('connections.map.arrange')}
        </Button>
      </div>
      <p className="m-0 text-sm text-meta">{t('connections.map.dragHint')}</p>
      <div aria-live="polite">{failure !== null && <Notice tone="error">{failure}</Notice>}</div>
      <RelationshipMap
        addressOf={addressOf}
        cast={cast}
        words={words}
        dragActions={{ onMove, onConnect }}
        focusId={focusId === '' ? null : focusId}
        pendingPlaces={pending.places}
      />
    </div>
  );
}
