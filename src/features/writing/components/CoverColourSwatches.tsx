/**
 * CoverColourSwatches: "Change the colours": the background row and the pattern or accent row,
 * nine round swatches each (story S1-E3-01; board NewStory 4.2).
 *
 * Board values: 44 px round swatches; the chosen one has a white and violet double ring and a
 * tick whose colour follows the swatch's contrast. Each row is a radiogroup; each swatch is named
 * "Background: Plum" or "Pattern or accent: Gold" for screen readers.
 * Rules: the 9-colour palette only (decided 16 Oct 2026). The note under the rows changes with
 * the design kind (plain: the line under the title; two-tone: the bottom band; else the pattern).
 * Who uses it: CoverSection.
 */
import { useTranslation } from 'react-i18next';

import { CheckIcon } from '@/components/icons/CheckIcon';
import {
  coverAccentPart,
  coverColourKeys,
  coverDesignByKey,
  coverPalette,
  titleColourOn,
  type CoverColourKey,
  type DrawnCoverChoice,
} from '@/components/covers/coverDesigns';

/** What the swatches need. */
export interface CoverColourSwatchesProps {
  choice: DrawnCoverChoice;
  onChange: (choice: DrawnCoverChoice) => void;
}

/** One row of nine swatches. */
function SwatchRow({
  label,
  nameKey,
  value,
  onPick,
}: {
  label: string;
  nameKey: 'cover.backgroundChoice' | 'cover.accentChoice';
  value: CoverColourKey;
  onPick: (colour: CoverColourKey) => void;
}) {
  const { t } = useTranslation('writing');
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-body">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {coverColourKeys.map((colour) => {
          const isChosen = colour === value;
          return (
            <button
              key={colour}
              type="button"
              role="radio"
              aria-checked={isChosen}
              aria-label={t(nameKey, { colour: t(`cover.colourNames.${colour}`) })}
              title={t(`cover.colourNames.${colour}`)}
              onClick={() => onPick(colour)}
              className={`inline-flex size-11 items-center justify-center rounded-full border border-[rgba(38,20,46,0.14)] ${isChosen ? 'ring-2 ring-link ring-offset-2 ring-offset-surface' : ''}`}
              style={{ backgroundColor: coverPalette[colour] }}
            >
              {isChosen && (
                <CheckIcon size={18} style={{ color: titleColourOn(coverPalette[colour]) }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Renders both rows and the notes.
 *
 * @returns the colour controls
 */
export function CoverColourSwatches({ choice, onChange }: CoverColourSwatchesProps) {
  const { t } = useTranslation('writing');
  // Which note explains the accent: the line under the title, the band or the pattern.
  const accentNoteKeys = {
    line: 'cover.accentNotePlain',
    band: 'cover.accentNoteTwotone',
    pattern: 'cover.accentNotePattern',
  } as const;
  const accentNote = t(accentNoteKeys[coverAccentPart(coverDesignByKey(choice.design).kind)]);

  return (
    <div className="flex flex-col gap-4">
      <h3 className="m-0 font-heading text-[19px] font-bold text-heading">
        {t('cover.changeColours')}
      </h3>
      <SwatchRow
        label={t('cover.background')}
        nameKey="cover.backgroundChoice"
        value={choice.background}
        onPick={(background) => onChange({ ...choice, background })}
      />
      <SwatchRow
        label={t('cover.accent')}
        nameKey="cover.accentChoice"
        value={choice.accent}
        onPick={(accent) => onChange({ ...choice, accent })}
      />
      <p className="m-0 text-[13px] text-meta">{accentNote}</p>
      <p className="m-0 text-[13px] text-meta">{t('cover.autoContrast')}</p>
    </div>
  );
}
