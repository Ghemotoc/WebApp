/**
 * RelationshipMap: the web of a story's cast (story S1-E17-15; user stories bundle 6, story 6.6,
 * board E25).
 *
 * - "Show categories" first: one pressed chip per category, each with its colour dot. Turning one
 *   off hides its lines here and its rows in the list under the map, so the switches are held by
 *   the page (hiddenCategories) and shared with the list.
 * - The map: characters with at least one relationship, placed by family and circle
 *   (lib/relationshipMap.ts), in a tinted box that scrolls sideways inside its own focusable region
 *   on tablets and phones, so the page itself never does. The protagonist wears the focus ring.
 * - The key under it: the line styles in words, and that the same relationships are listed below.
 * - "Category colours" (the writer's map only), where the writer picks each category's colour.
 * - The rest of the cast, "Not on the map yet".
 * Every card is a real link to the character's sheet (or, on a readers' page, their public page
 * while Characters is public). The drawing is hidden from screen readers: the list says it all.
 * Who uses it: ConnectionsPage and PublicConnections. What it calls: the layout helpers,
 * MapLines, MapCards, MapCategorySwitches and CategoryColoursFold.
 */
import type { StoryCast } from '../api/characters';
import type { RelationshipWords } from '../hooks/useRelationshipWords';
import {
  categoryOf,
  type RelationshipCategory,
  type RelationshipSwatch,
} from '../lib/relationshipCategories';
import { layoutRelationshipMap, splitMapCast } from '../lib/relationshipMap';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { CategoryColoursFold } from './CategoryColoursFold';
import { MapCards } from './MapCards';
import { MapCategorySwitches } from './MapCategorySwitches';
import { MapLines } from './MapLines';

/** What the map needs. */
export interface RelationshipMapProps {
  /** Where a character's card opens: their sheet, a reader page, or null for no link. */
  addressOf: (characterId: string) => string | null;
  cast: StoryCast;
  words: RelationshipWords;
  /** The categories switched off, shared with the list under the map. */
  hiddenCategories: RelationshipCategory[];
  onHiddenChange: (hiddenCategories: RelationshipCategory[]) => void;
  /** Saves a category's colour; left out on a readers' map, which has no colour picker. */
  onPickColour?: (category: RelationshipCategory, swatch: RelationshipSwatch) => Promise<void>;
}

/** "Not on the map yet": the characters with no relationship. */
function OffMapLine({ offMap, words }: { offMap: string[]; words: RelationshipWords }) {
  const { t } = useAtlasTranslation();
  return (
    <p className="m-0 type-meta text-ink-muted">
      {t('connections.map.offMap', { names: offMap.map((id) => words.nameOf(id)).join(', ') })}
    </p>
  );
}

/**
 * Renders the switches, the map, its key and the characters not on it.
 *
 * @returns the map's whole block
 */
export function RelationshipMap({
  addressOf,
  cast,
  words,
  hiddenCategories,
  onHiddenChange,
  onPickColour,
}: RelationshipMapProps) {
  const { t } = useAtlasTranslation();
  // Step 1: who is on the map (every relationship decides it, so cards don't come and go with the
  // switches) and the lines whose category is switched on.
  const { onMap, offMap } = splitMapCast(
    cast.characters.map((character) => character.id),
    cast.relationships,
  );
  const shown = cast.relationships.filter(
    (relationship) => !hiddenCategories.includes(categoryOf(relationship.kind)),
  );
  const layout = layoutRelationshipMap(onMap, cast.relationships, shown);
  const colours = cast.relationshipColours;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <MapCategorySwitches
        hiddenCategories={hiddenCategories}
        onChange={onHiddenChange}
        colours={colours}
      />
      {onMap.length === 0 && <p className="m-0 text-ink-muted">{t('connections.map.none')}</p>}
      {/* Step 2: the map scrolls sideways inside its own region, which can be focused and
          scrolled by keyboard, with no scrollbar showing (Robert, 23 Nov 2026). */}
      {onMap.length > 0 && (
        <div
          role="region"
          aria-label={t('connections.map.region')}
          tabIndex={0}
          className="max-w-full overflow-x-auto rounded-card bg-surface-solid p-4"
          data-testid="atlas-relationship-map"
        >
          <div className="relative" style={{ width: layout.width, height: layout.height }}>
            <MapLines layout={layout} colours={colours} />
            <MapCards addressOf={addressOf} cast={cast} nodes={layout.nodes} />
          </div>
        </div>
      )}
      <p className="m-0 max-w-none type-meta text-ink-muted">
        {t(onPickColour === undefined ? 'connections.map.readerKey' : 'connections.map.key')}
      </p>
      {onPickColour !== undefined && (
        <CategoryColoursFold colours={colours} onPick={onPickColour} />
      )}
      {onMap.length > 0 && offMap.length > 0 && <OffMapLine offMap={offMap} words={words} />}
    </div>
  );
}
