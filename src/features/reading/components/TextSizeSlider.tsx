/**
 * TextSizeSlider: the "Text size" slider in the reading settings (story S1-E4-02; board 3.5; redrawn to board B04 in BOOKS B04).
 *
 * Board values (B04-ReaderSettings, BOOKS B04): the name, then a small and a large "A" either
 * side of a 14 to 28 px range input on the same line, with the size under them. Until the reader moves it, the slider shows the size that follows
 * the device ("19 px, from your device"); once they pick one, "Use my device's size" brings the
 * device's size back (S1-E4-02, third criterion).
 * Who uses it: ReadingSettingsPanel. What it calls: nothing; onChange goes to useReadingSettings.
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import { largestTextSize, smallestTextSize } from '../lib/readingStyle';

/** What the slider needs. */
export interface TextSizeSliderProps {
  /** The reader's own size, or null while it follows the device. */
  chosenSize: number | null;
  /** The size that follows the device. */
  deviceSize: number;
  /** A new size, or null to follow the device again. */
  onChange: (size: number | null) => void;
}

/**
 * Renders the slider.
 *
 * @returns the label, the value, the range input and, after a choice, the way back
 */
export function TextSizeSlider({ chosenSize, deviceSize, onChange }: TextSizeSliderProps) {
  const { t } = useTranslation('reading');
  const inputId = useId();
  const size = chosenSize ?? deviceSize;
  const valueText =
    chosenSize === null
      ? t('settings.textSizeFromDevice', { size })
      : t('settings.textSizeValue', { size });
  return (
    <div className="flex flex-col gap-1">
      {/* BOOKS B04 (board B04-ReaderSettings): the name and the slider on one line, the size
          under them, as the board draws Text size. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <label htmlFor={inputId} className="type-label text-ink-heading">
          {t('settings.textSize')}
        </label>
        <div className="flex min-h-11 min-w-[160px] flex-1 items-center gap-3">
          <span aria-hidden="true" className="type-meta text-ink-muted">
            A
          </span>
          <input
            id={inputId}
            type="range"
            min={smallestTextSize}
            max={largestTextSize}
            step={1}
            value={size}
            aria-valuetext={valueText}
            onChange={(event) => onChange(Number(event.target.value))}
            className="m-0 min-w-0 flex-1 accent-primary"
          />
          <span aria-hidden="true" className="type-heading text-ink-muted">
            A
          </span>
        </div>
      </div>
      <span className="type-meta text-ink-muted">{valueText}</span>
      {chosenSize !== null && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="inline-flex min-h-11 w-fit items-center type-body font-semibold text-link underline"
        >
          {t('settings.followDevice')}
        </button>
      )}
    </div>
  );
}
