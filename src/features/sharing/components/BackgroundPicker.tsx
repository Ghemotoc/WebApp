/**
 * BackgroundPicker: "Background" on the quote card (story S1-E4-07, fourth criterion; board 3.6).
 *
 * Board values: an eyebrow, the "Purple" chip (the default), then "Or one of our colours:" and
 * nine round swatches. Every choice is a toggle button with aria-pressed and a tick when chosen,
 * never colour alone (DoD pill system); each swatch is named ("Gold") and 44 px across.
 * "Story cover" and "Your own picture" come later with the image check (docs/board-fixes.md).
 * Who uses it: QuoteCardDialog.
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import { Chip } from '@/components/ui/Chip';
import { CheckIcon } from '@/components/icons/CheckIcon';

import { paletteBackgrounds, purpleBackground, type QuoteCardBackground } from '../lib/quoteCard';

/** What the picker needs. */
export interface BackgroundPickerProps {
  chosen: QuoteCardBackground;
  onChoose: (background: QuoteCardBackground) => void;
}

/**
 * One round colour swatch.
 *
 * @returns the swatch button
 */
function Swatch(props: {
  background: QuoteCardBackground;
  isChosen: boolean;
  label: string;
  onChoose: () => void;
}) {
  const tickColour = props.background.isLight ? 'text-[#2A0E33]' : 'text-white';
  return (
    <button
      type="button"
      aria-pressed={props.isChosen}
      aria-label={props.label}
      title={props.label}
      onClick={props.onChoose}
      style={{ backgroundColor: props.background.colours[0] }}
      className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full border border-control-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
    >
      {props.isChosen && <CheckIcon className={tickColour} />}
    </button>
  );
}

/**
 * Renders the picker.
 *
 * @returns the group of choices
 */
export function BackgroundPicker({ chosen, onChoose }: BackgroundPickerProps) {
  const { t } = useTranslation('sharing');
  const headingId = useId();
  const coloursId = useId();
  return (
    <div role="group" aria-labelledby={headingId} className="flex flex-col gap-3">
      <p id={headingId} className="m-0 font-eyebrow text-sm text-eyebrow">
        {t('quote.background')}
      </p>
      <div>
        <Chip
          isPressed={chosen.key === purpleBackground.key}
          onPressedChange={() => onChoose(purpleBackground)}
        >
          {t('quote.purple')}
        </Chip>
      </div>
      <div role="group" aria-labelledby={coloursId} className="flex flex-wrap items-center gap-2.5">
        <span id={coloursId} className="text-sm font-semibold text-ink">
          {t('quote.ourColours')}
        </span>
        {paletteBackgrounds.map((background) => (
          <Swatch
            key={background.key}
            background={background}
            isChosen={chosen.key === background.key}
            label={t(`quote.colours.${background.key}`)}
            onChoose={() => onChoose(background)}
          />
        ))}
      </div>
    </div>
  );
}
