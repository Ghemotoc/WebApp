/**
 * CategoryColoursFold: "Category colours", the fold under the relationship map's chips where the
 * writer picks a colour for each category (CALM-9, board E25: "one row per category with 8 round
 * swatches (Blue, Pink, Yellow, Aqua, Orange, Violet, Green, Red) as a radio group. The chosen one
 * has a ring. Save the choice per story").
 *
 * Board values: a text button with a palette icon opens the fold; inside, a line of help, then
 * one row per category (its dot and name, then the swatches). Swatches are 28 px round, the
 * chosen one ringed in the heading colour with a gap of the card's colour. Each row is a
 * radiogroup named "Colour for Family"; arrow keys move between its swatches and choose, as in
 * any radio group, and only the chosen swatch is in the tab order.
 * Who uses it: RelationshipMap, on the writer's own map only. What it calls: CategoryDot and the
 * category helpers; the save goes through the onPick prop (useRelationshipColour).
 */
import { useRef, useState, type KeyboardEvent } from 'react';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { Notice } from '@/components/ui/Notice';

import {
  lineEdgeColour,
  relationshipCategories,
  relationshipSwatches,
  swatchColour,
  swatchOf,
  type RelationshipCategory,
  type RelationshipColours,
  type RelationshipSwatch,
} from '../lib/relationshipCategories';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { CategoryDot } from './CategoryDot';

/** What the fold needs. */
export interface CategoryColoursFoldProps {
  colours: RelationshipColours;
  /** Saves one category's colour; throws when it can't. */
  onPick: (category: RelationshipCategory, swatch: RelationshipSwatch) => Promise<void>;
}

/** Which swatch an arrow key moves to from the one at `index`, or null for any other key. */
function nextSwatchIndex(key: string, index: number): number | null {
  const count = relationshipSwatches.length;
  if (key === 'ArrowRight' || key === 'ArrowDown') return (index + 1) % count;
  if (key === 'ArrowLeft' || key === 'ArrowUp') return (index - 1 + count) % count;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return null;
}

/** One round swatch, a radio in its category's group. */
function SwatchButton({
  swatch,
  isChosen,
  buttonRef,
  onChoose,
  onKeyDown,
}: {
  swatch: RelationshipSwatch;
  isChosen: boolean;
  buttonRef: (button: HTMLButtonElement | null) => void;
  onChoose: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}) {
  const { t } = useAtlasTranslation();
  const name = t(`connections.map.swatches.${swatch}`);
  return (
    <button
      ref={buttonRef}
      type="button"
      role="radio"
      aria-checked={isChosen}
      aria-label={name}
      title={name}
      // Only the chosen swatch is in the tab order; arrow keys reach the others.
      tabIndex={isChosen ? 0 : -1}
      onClick={onChoose}
      onKeyDown={onKeyDown}
      className="size-7 rounded-full"
      style={{
        backgroundColor: swatchColour(swatch),
        // The chosen swatch: a ring in the heading colour with a gap of the card's colour; the
        // others a thin edge, so a light swatch still shows on the card.
        boxShadow: isChosen
          ? '0 0 0 2px var(--surface), 0 0 0 4px var(--heading)'
          : `inset 0 0 0 1px ${lineEdgeColour}`,
      }}
    />
  );
}

/** One category's row: its dot and name, then the eight swatches as a radio group. */
function SwatchRow({
  category,
  colours,
  onPick,
}: {
  category: RelationshipCategory;
  colours: RelationshipColours;
  onPick: (category: RelationshipCategory, swatch: RelationshipSwatch) => void;
}) {
  const { t } = useAtlasTranslation();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const chosen = swatchOf(category, colours);
  const categoryName = t(`connections.categories.${category}`);

  /** Arrow keys pick the next swatch and move the focus to it, as a radio group does. */
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = nextSwatchIndex(event.key, index);
    const nextSwatch = next === null ? undefined : relationshipSwatches[next];
    if (next === null || nextSwatch === undefined) return;
    event.preventDefault();
    buttons.current[next]?.focus();
    onPick(category, nextSwatch);
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-hairline py-2.5 last:border-b-0">
      <span className="flex min-w-[9rem] items-center gap-2 text-sm font-semibold text-ink">
        <CategoryDot category={category} colours={colours} />
        {categoryName}
      </span>
      <div
        role="radiogroup"
        aria-label={t('connections.map.colourFor', { category: categoryName })}
        className="flex flex-wrap gap-2"
      >
        {relationshipSwatches.map((swatch, index) => (
          <SwatchButton
            key={swatch}
            swatch={swatch}
            isChosen={swatch === chosen}
            buttonRef={(button) => {
              buttons.current[index] = button;
            }}
            onChoose={() => onPick(category, swatch)}
            onKeyDown={(event) => onKeyDown(event, index)}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Renders the fold, closed at first.
 *
 * @returns the "Category colours" fold
 */
export function CategoryColoursFold({ colours, onPick }: CategoryColoursFoldProps) {
  const { t } = useAtlasTranslation();
  const [failed, setFailed] = useState(false);

  /** Saves a pick; says plainly when it couldn't (the old colour comes back). */
  function pick(category: RelationshipCategory, swatch: RelationshipSwatch) {
    setFailed(false);
    onPick(category, swatch).catch(() => setFailed(true));
  }

  return (
    <details className="group" data-testid="atlas-category-colours">
      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 font-semibold text-link underline underline-offset-4 [&::-webkit-details-marker]:hidden">
        <ActionIcon name="palette" size={18} />
        {t('connections.map.coloursButton')}
      </summary>
      <div className="mt-2 flex flex-col gap-2 rounded-card border border-hairline p-4">
        <p className="m-0 text-sm text-body">{t('connections.map.coloursIntro')}</p>
        {relationshipCategories.map((category) => (
          <SwatchRow key={category} category={category} colours={colours} onPick={pick} />
        ))}
        <div aria-live="polite">
          {failed && <Notice tone="error">{t('connections.map.colourFailed')}</Notice>}
        </div>
      </div>
    </details>
  );
}
