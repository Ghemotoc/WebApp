/**
 * ReadingSettingsPanel: what Aa opens, "Reading settings" (story S1-E4-02; the simplified design,
 * bundle CALM-5; redrawn to board B04-ReaderSettings in BOOKS B04, user story 2.4).
 *
 * Values from the board (design files day v25, night v24): the heading and a Close ×, then Paper
 * (White, Sepia, Grey, Black), Night mode, Typeface (Literata, Inter, OpenDyslexic, Atkinson),
 * Text size and Time left, each row under a hairline. The settings the board leaves out (Night by
 * the clock, the reading ruler, Line spacing and Line width) stay, under a closed "More options"
 * at the bottom, Night by the clock first (DESIGN, 24 Nov 2026: keep every feature).
 * Where it opens (CALM-5; handover Step 4, point 8): from 1280 px as a panel at the top of the
 * reader's side column, above About this story; below 1280 px inside the reader's bottom sheet
 * (ReaderSheet), which never covers the column being read on a desktop. It never opens on load.
 * Every change shows on the chapter at once and is remembered: on the account when signed in, in
 * the browser when signed out (useReadingSettings). The card scrolls inside itself when it is
 * taller than the window, as it is on a phone. No doodles: this is the chapter reader.
 * Who uses it: ReaderToolPlace, loaded the first time Aa is pressed. What it calls:
 * useReadingSettings, ReadingSettingsChoices, TextSizeSlider, ReadingComfortFields and
 * ChoiceChips (Line spacing and Line width).
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { cn } from '@/lib/utils';

import type { ReadingLineSpacing, ReadingLineWidth } from '../api/readingSettings';
import { useReadingSettings } from '../hooks/useReadingSettings';

import { ReadingComfortFields } from './ReadingComfortFields';
import {
  NightModeRow,
  PaperChoice,
  settingsRowClass,
  TimeLeftChoice,
  TypefaceChoice,
  type ChoicesProps,
} from './ReadingSettingsChoices';
import { CloseIcon } from './ReaderIcons';
import { TextSizeSlider } from './TextSizeSlider';

/** The choices in the order the panel showed them before BOOKS B04. */
const spacings: ReadingLineSpacing[] = ['compact', 'normal', 'wide'];
const widths: ReadingLineWidth[] = ['narrow', 'medium', 'wide'];

/** What the panel needs. */
export interface ReadingSettingsPanelProps {
  id: string;
  /** The size that follows the device. */
  deviceSize: number;
  /** The open chapter, whose paper a pick by hand may change for this chapter only. */
  chapterCode: string;
  onClose: () => void;
  /** True inside the bottom sheet (below 1280 px), which draws the box itself. */
  isInSheet: boolean;
}

/**
 * A group's options from its values and their translation keys.
 *
 * @param values - the choices
 * @param keyPrefix - their block in reading.json's "settings"
 * @param t - the translation function
 * @returns the chips' values and labels
 */
function optionsFor(values: string[], keyPrefix: string, t: (key: string) => string) {
  return values.map((value) => ({ value, label: t(`settings.${keyPrefix}.${value}`) }));
}

/**
 * More options: closed until pressed, holding the settings the board doesn't draw. Night by the
 * clock comes first, so it sits near Night mode (DESIGN, 24 Nov 2026).
 *
 * @returns the disclosure
 */
function MoreOptions({ settings, change }: ChoicesProps) {
  const { t } = useTranslation('reading');
  return (
    <details className="border-t border-hairline pt-3">
      <summary className="inline-flex min-h-11 cursor-pointer items-center type-body font-semibold text-link underline">
        {t('settings.moreOptions')}
      </summary>
      <div className="flex flex-col gap-4 pt-2">
        <ReadingComfortFields settings={settings} change={change} />
        <ChoiceChips
          label={t('settings.lineSpacing')}
          isLabelVisible
          options={optionsFor(spacings, 'spacings', t)}
          value={settings.lineSpacing}
          onChange={(value) => change({ lineSpacing: value as ReadingLineSpacing })}
        />
        <ChoiceChips
          label={t('settings.lineWidth')}
          isLabelVisible
          options={optionsFor(widths, 'widths', t)}
          value={settings.lineWidth}
          onChange={(value) => change({ lineWidth: value as ReadingLineWidth })}
        />
      </div>
    </details>
  );
}

/** The line shown only when the account refused a save; the settings still apply here. */
function SaveProblem() {
  const { t } = useTranslation('reading');
  return (
    <p role="alert" className="m-0 border-t border-hairline pt-3 type-meta text-destructive">
      {t('settings.saveFailed')}
    </p>
  );
}

/**
 * Renders the panel.
 *
 * @returns the settings card
 */
export function ReadingSettingsPanel({
  id,
  deviceSize,
  chapterCode,
  onClose,
  isInSheet,
}: ReadingSettingsPanelProps) {
  const { t } = useTranslation('reading');
  const { settings, change, saveFailed } = useReadingSettings();
  // Opening moves focus to the heading, so the next Tab is inside the panel.
  useEffect(() => {
    document.getElementById(`${id}-title`)?.focus();
  }, [id]);
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      // In the side column it is its own box; in the sheet the sheet is the box.
      className={cn('flex flex-col', !isInSheet && 'box-surface rounded-card p-6')}
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2
          id={`${id}-title`}
          tabIndex={-1}
          className="m-0 type-subheading text-ink-heading outline-none"
        >
          {t('settings.title')}
        </h2>
        <button
          type="button"
          aria-label={t('settings.close')}
          onClick={onClose}
          className="-mr-3 inline-flex size-11 items-center justify-center rounded-full text-ink-muted hover:bg-tint"
        >
          <CloseIcon />
        </button>
      </div>
      <PaperChoice settings={settings} change={change} chapterCode={chapterCode} />
      <NightModeRow />
      <TypefaceChoice settings={settings} change={change} />
      <div className={settingsRowClass}>
        <TextSizeSlider
          chosenSize={settings.textSize}
          deviceSize={deviceSize}
          onChange={(size) => change({ textSize: size })}
        />
      </div>
      <TimeLeftChoice settings={settings} change={change} />
      <MoreOptions settings={settings} change={change} />
      {saveFailed && <SaveProblem />}
    </section>
  );
}
