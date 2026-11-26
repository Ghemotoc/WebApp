/**
 * ConnectionsMapView: the Map view of the writer's Relationships page (story S1-E17-15; user
 * stories bundle 6, story 6.6, board E25).
 *
 * Top to bottom, as the board draws it: "Show categories", the map and its key ("Category colours"
 * under it, where the writer picks each category's colour, saved on the story), then
 * "Relationships" with the count and every relationship in words (each with Delete, which offers
 * "Removed. Undo" for 8 seconds, "Keep private" and "Readers see it from", story 6.14), then
 * "Add a relationship" with the form side by side (the page's one main button). The category switches filter the map and the list
 * together. The hint above the form shows for the first three visits, then folds away.
 * Who uses it: ConnectionsPage. What it calls: RelationshipMap, RelationshipList,
 * ItemVisibilityControls, AddRelationshipForm, useRelationshipChangers and useRelationshipColour.
 */
import { useState } from 'react';

import type { StoryCast } from '../api/characters';
import { useRelationshipChangers } from '../hooks/useRelationshipChangers';
import { useRelationshipColour } from '../hooks/useRelationshipColour';
import type { RelationshipWords } from '../hooks/useRelationshipWords';
import { countAtlasVisit, showsAddHints } from '../lib/addHintVisits';
import { categoryOf, type RelationshipCategory } from '../lib/relationshipCategories';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { AddRelationshipForm } from './AddRelationshipForm';
import { ItemVisibilityControls } from './ItemVisibilityControls';
import { RelationshipList } from './RelationshipList';
import { RelationshipMap } from './RelationshipMap';

/** What the view needs. */
export interface ConnectionsMapViewProps {
  slug: string;
  cast: StoryCast;
  words: RelationshipWords;
  addressOf: (characterId: string) => string | null;
}

/** "Relationships": the count, then every shown relationship in words. */
function RelationshipsSection({
  slug,
  cast,
  words,
  hiddenCategories,
}: Omit<ConnectionsMapViewProps, 'addressOf'> & { hiddenCategories: RelationshipCategory[] }) {
  const { t } = useAtlasTranslation();
  const { unrelate } = useRelationshipChangers(slug);
  const shown = cast.relationships.filter(
    (relationship) => !hiddenCategories.includes(categoryOf(relationship.kind)),
  );
  return (
    // Each section opens with a hairline and 24 px above its heading (board E25's .fgroup).
    <section
      aria-labelledby="atlas-relationships-heading"
      className="flex min-w-0 flex-col gap-2 border-t border-hairline pt-6"
    >
      <h2
        id="atlas-relationships-heading"
        className="m-0 font-heading type-heading font-bold text-ink-heading"
      >
        {t('connections.list.heading')}
      </h2>
      <p className="m-0 type-meta text-ink-muted">
        {t('connections.list.count', { count: shown.length })}
      </p>
      <RelationshipList
        relationships={shown}
        words={words}
        colours={cast.relationshipColours}
        onDelete={unrelate}
        extra={(relationship, sentence) => (
          <ItemVisibilityControls
            slug={slug}
            itemId={relationship.id}
            itemName={sentence}
            allowsGuard
          />
        )}
      />
    </section>
  );
}

/** "Add a relationship": the form at the foot of the page, its pickers side by side. */
function AddRelationshipSection({ slug, cast }: { slug: string; cast: StoryCast }) {
  const { t } = useAtlasTranslation();
  const { relate } = useRelationshipChangers(slug);
  // The hint shows for the first three visits to Story Atlas on this device (story 6.6).
  const [visits] = useState(countAtlasVisit);
  return (
    <section
      id="atlas-add-relationship"
      aria-labelledby="atlas-add-relationship-heading"
      className="flex min-w-0 flex-col gap-4 border-t border-hairline pt-6"
    >
      <h2
        id="atlas-add-relationship-heading"
        className="m-0 font-heading type-heading font-bold text-ink-heading"
      >
        {t('connections.add.heading')}
      </h2>
      <AddRelationshipForm
        idPrefix="atlas-relationship"
        cast={cast}
        layout="row"
        showsHint={showsAddHints(visits)}
        onAdd={relate}
      />
    </section>
  );
}

/**
 * Renders the map, the list and the form.
 *
 * @returns the Map view
 */
export function ConnectionsMapView({ slug, cast, words, addressOf }: ConnectionsMapViewProps) {
  const { pickColour } = useRelationshipColour(slug);
  // The switches the map and the list share (story 6.6: "filters the map and the list together").
  const [hiddenCategories, setHiddenCategories] = useState<RelationshipCategory[]>([]);
  return (
    <div className="flex min-w-0 flex-col gap-8">
      <RelationshipMap
        addressOf={addressOf}
        cast={cast}
        words={words}
        hiddenCategories={hiddenCategories}
        onHiddenChange={setHiddenCategories}
        onPickColour={pickColour}
      />
      <RelationshipsSection
        slug={slug}
        cast={cast}
        words={words}
        hiddenCategories={hiddenCategories}
      />
      <AddRelationshipSection slug={slug} cast={cast} />
    </div>
  );
}
