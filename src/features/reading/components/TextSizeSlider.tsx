/**
 * TextSizeSlider: the "Text size" slider in the reading settings (story S1-E4-02; board 3.5).
 *
 * Board values: an eyebrow label with the size on the right, a small and a large "A" either side
 * of a 14 to 28 px range input. Until the reader moves it, the slider shows the size that follows
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
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor={inputId}
          className="font-eyebrow text-sm leading-[1.3] font-normal text-eyebrow"
        >
          {t('settings.textSize')}
        </label>
        <span className="text-right text-[13px] font-semibold text-meta">{valueText}</span>
      </div>
      <div className="flex min-h-11 items-center gap-3">
        <span aria-hidden="true" className="text-[13px] text-body">
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
        <span aria-hidden="true" className="text-[22px] text-body">
          A
        </span>
      </div>
      {chosenSize !== null && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="inline-flex min-h-11 w-fit items-center text-sm font-semibold text-link underline"
        >
          {t('settings.followDevice')}
        </button>
      )}
    </div>
  );
}
