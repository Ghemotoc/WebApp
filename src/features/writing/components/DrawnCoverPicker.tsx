/**
 * DrawnCoverPicker: the 16 approved backgrounds as small tiles (story S1-E3-01; board
 * NewStory 4.2, "Pick a background").
 *
 * Board values: a grid of tiles at least 76 px wide (3 per row on phones), each a 5:8 cover with
 * a "Title" label and its name under it; the chosen tile has a 2 px violet ring. It is a
 * radiogroup: arrow keys move between tiles, Space or Enter picks one.
 * Rules: 9 plain colours and 7 patterns (decided 16 Oct 2026). Picking a design starts from its
 * board default colours; CoverColourSwatches then recolours it within the palette.
 * Who uses it: CoverSection.
 */
import { useId, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';

import {
  coverDesigns,
  type CoverDesignKey,
  type DrawnCoverChoice,
} from '@/components/covers/coverDesigns';
import { DrawnCover } from '@/components/covers/DrawnCover';
import { cn } from '@/lib/utils';

/** What the picker needs. */
export interface DrawnCoverPickerProps {
  /** The current drawn choice, or null when the cover is automatic. */
  choice: DrawnCoverChoice | null;
  onPick: (design: CoverDesignKey) => void;
}

/**
 * Renders the tile grid.
 *
 * @returns the radiogroup of tiles
 */
export function DrawnCoverPicker({ choice, onPick }: DrawnCoverPickerProps) {
  const { t } = useTranslation('writing');
  const groupId = useId();
  const chosenIndex = coverDesigns.findIndex((design) => design.key === choice?.design);

  /** Arrow keys move the choice; the picked tile takes focus. */
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const next = (index + step + coverDesigns.length) % coverDesigns.length;
    const design = coverDesigns[next];
    if (design === undefined) return;
    onPick(design.key);
    document.getElementById(`${groupId}-${next}`)?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={t('cover.designs')}
      className="grid grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-1.5"
    >
      {coverDesigns.map((design, index) => {
        const isChosen = choice?.design === design.key;
        // The chosen tile shows the writer's colours; the others show their board defaults.
        const tileChoice =
          isChosen && choice !== null
            ? choice
            : { design: design.key, background: design.background, accent: design.accent };
        return (
          <button
            key={design.key}
            id={`${groupId}-${index}`}
            type="button"
            role="radio"
            aria-checked={isChosen}
            aria-label={t(`cover.designNames.${design.key}`)}
            tabIndex={isChosen || (chosenIndex === -1 && index === 0) ? 0 : -1}
            onClick={() => onPick(design.key)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              'flex flex-col items-center gap-1 rounded-xl border-2 bg-transparent p-1 text-center',
              isChosen ? 'border-link' : 'border-transparent hover:border-border',
            )}
          >
            <DrawnCover
              title={t('cover.tileTitle')}
              choice={tileChoice}
              size="tile"
              isDecorative
              className="w-full"
            />
            <span className="text-[11px] leading-tight text-meta" aria-hidden="true">
              {t(`cover.designNames.${design.key}`)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
