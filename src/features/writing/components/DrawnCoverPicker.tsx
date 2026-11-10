/**
 * DrawnCoverPicker: the 19 approved backgrounds as small tiles (story S1-E3-01; board
 * NewStory 4.2, "Pick a background"; bundle G9 WRITING, part c, adds three patterns).
 *
 * Board values: a grid of tiles at least 76 px wide (3 per row on phones), each a 5:8 cover with
 * a "Title" label and its name under it; the chosen tile has a 2 px violet ring. It is a
 * radiogroup: arrow keys move between tiles, Space or Enter picks one.
 * The three designs G9c added (Arches, Rings, Forest waves) carry the liquid glass board's "New"
 * pill in the tile's top corner, and screen readers hear "Arches, new".
 * Rules: 9 plain colours and 10 patterns (decided 16 Oct 2026, plus G9c). Picking a design starts from its
 * board default colours; CoverColourSwatches then recolours it within the palette.
 * Who uses it: CoverSection.
 */
import { useId, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';

import {
  coverDesigns,
  type CoverDesign,
  type CoverDesignKey,
  type DrawnCoverChoice,
} from '@/components/covers/coverDesigns';
import { DrawnCover } from '@/components/covers/DrawnCover';
import { InfoPill } from '@/components/ui/InfoPill';
import { cn } from '@/lib/utils';

/** What the picker needs. */
export interface DrawnCoverPickerProps {
  /** The current drawn choice, or null when the cover is automatic. */
  choice: DrawnCoverChoice | null;
  onPick: (design: CoverDesignKey) => void;
}

/** What one tile needs. */
interface CoverTileProps {
  id: string;
  design: CoverDesign;
  /** The colours the tile is drawn in: the writer's on the chosen tile, else the defaults. */
  tileChoice: DrawnCoverChoice;
  isChosen: boolean;
  /** True for the one tile the Tab key lands on (roving tab index). */
  isTabStop: boolean;
  onPick: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}

/**
 * One tile: the small cover, its name and, for the G9c designs, the "New" pill.
 *
 * @returns the radio button
 */
function CoverTile({
  id,
  design,
  tileChoice,
  isChosen,
  isTabStop,
  onPick,
  onKeyDown,
}: CoverTileProps) {
  const { t } = useTranslation('writing');
  // A new design says so in its name too, so the pill is not the only way to know.
  const designName = t(`cover.designNames.${design.key}`);
  const tileLabel =
    design.isNew === true ? t('cover.designNameNew', { name: designName }) : designName;
  return (
    <button
      id={id}
      type="button"
      role="radio"
      aria-checked={isChosen}
      aria-label={tileLabel}
      tabIndex={isTabStop ? 0 : -1}
      onClick={onPick}
      onKeyDown={onKeyDown}
      className={cn(
        'relative flex flex-col items-center gap-1 rounded-xl border-2 bg-transparent p-1 text-center',
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
        {designName}
      </span>
      {design.isNew === true && (
        <span className="absolute top-2 right-2" aria-hidden="true">
          <InfoPill tone="plum">{t('cover.newDesign')}</InfoPill>
        </span>
      )}
    </button>
  );
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
          <CoverTile
            key={design.key}
            id={`${groupId}-${index}`}
            design={design}
            tileChoice={tileChoice}
            isChosen={isChosen}
            isTabStop={isChosen || (chosenIndex === -1 && index === 0)}
            onPick={() => onPick(design.key)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          />
        );
      })}
    </div>
  );
}
