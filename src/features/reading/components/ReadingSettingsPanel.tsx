/**
 * ReadingSettingsPanel: what Aa opens, "Reading settings" (story S1-E4-02; board 3.5 Reader;
 * the simplified design, bundle CALM-5).
 *
 * Values: the heading and a Close ×, then Font, Text size, Line spacing, Line width and Theme,
 * Night by the clock and the reading ruler, Time left, and a line saying the settings are saved
 * to the account. Where it opens (CALM-5; handover Step 4, point 8): from 1280 px as a glass
 * panel at the top of the reader's side column, above About this story; below 1280 px inside the
 * reader's bottom sheet (ReaderSheet). It never opens on load. Every change shows on the chapter
 * at once. Time left (point 10) is a segmented control: In the bar, the default, or On the page.
 * No doodles: this is the
 * chapter reader (DoD design rules). The board's "Later, in the apps: any font on your device"
 * block is left out until the desktop and phone apps exist (docs/board-fixes.md).
 * Reading comfort (IDEAS-1 part a): Atkinson Hyperlegible joins the fonts (IDEA-20261031-6);
 * under Theme come Night by the clock (7) and the reading ruler (8), in ReadingComfortFields.
 * The Theme chips show the chapter's theme: while the clock has turned it to Night, a pick by
 * hand counts for this chapter only (useChapterTheme), so the usual theme stays as it was.
 * The card scrolls inside itself when it is taller than the window, as it is on a phone.
 * Who uses it: ReaderToolPlace, loaded the first time Aa is pressed. What it calls:
 * useReadingSettings (the reader's settings), which saves to the account, and useChapterTheme.
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { CheckIcon } from '@/components/icons/CheckIcon';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { cn } from '@/lib/utils';

import type {
  ReadingFont,
  ReadingLineSpacing,
  ReadingLineWidth,
  ReadingSettings,
  ReadingTheme,
  ReadingTimeLeftPlace,
} from '../api/readingSettings';
import { pickThemeForChapter, useChapterTheme } from '../hooks/useChapterTheme';
import { useReadingSettings } from '../hooks/useReadingSettings';

import { ReadingComfortFields } from './ReadingComfortFields';
import { CloseIcon } from './ReaderIcons';
import { TextSizeSlider } from './TextSizeSlider';

/** The choices in the board's order. */
const fonts: ReadingFont[] = ['sans', 'serif', 'dyslexia_friendly', 'atkinson_hyperlegible'];
const spacings: ReadingLineSpacing[] = ['compact', 'normal', 'wide'];
const widths: ReadingLineWidth[] = ['narrow', 'medium', 'wide'];
const themes: ReadingTheme[] = ['light', 'sepia', 'night'];

/** What the panel needs. */
export interface ReadingSettingsPanelProps {
  id: string;
  /** The size that follows the device. */
  deviceSize: number;
  /** The open chapter, whose theme a pick by hand may change for this chapter only. */
  chapterCode: string;
  onClose: () => void;
  /** True inside the bottom sheet (below 1280 px), which draws the glass itself. */
  isInSheet: boolean;
}

/** What a group of chips needs. */
interface ChoicesProps {
  settings: ReadingSettings;
  change: (changes: Partial<ReadingSettings>) => void;
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

/** The font chips, first on the board. */
function FontChoice({ settings, change }: ChoicesProps) {
  const { t } = useTranslation('reading');
  return (
    <ChoiceChips
      label={t('settings.font')}
      isLabelVisible
      isLabelEyebrow
      options={optionsFor(fonts, 'fonts', t)}
      value={settings.font}
      onChange={(value) => change({ font: value as ReadingFont })}
      description={t('settings.fontHint')}
      descriptionId="reading-settings-font-hint"
    />
  );
}

/** The Theme chips: the chapter's theme, with a pick by hand kept for this chapter at night. */
function ThemeChoice({ settings, change, chapterCode }: ChoicesProps & { chapterCode: string }) {
  const { t } = useTranslation('reading');
  const { theme, isClockNight } = useChapterTheme(settings, chapterCode);
  const pick = (value: string) => {
    const picked = value as ReadingTheme;
    // While the clock decides, the pick wins until the next chapter; otherwise it is the usual theme.
    if (isClockNight) pickThemeForChapter(chapterCode, picked);
    else change({ theme: picked });
  };
  return (
    <ChoiceChips
      label={t('settings.theme')}
      isLabelVisible
      isLabelEyebrow
      options={optionsFor(themes, 'themes', t)}
      value={theme}
      onChange={pick}
    />
  );
}

/** The line spacing and line width chips. */
function SettingChoices({ settings, change }: ChoicesProps) {
  const { t } = useTranslation('reading');
  return (
    <>
      <ChoiceChips
        label={t('settings.lineSpacing')}
        isLabelVisible
        isLabelEyebrow
        options={optionsFor(spacings, 'spacings', t)}
        value={settings.lineSpacing}
        onChange={(value) => change({ lineSpacing: value as ReadingLineSpacing })}
      />
      <ChoiceChips
        label={t('settings.lineWidth')}
        isLabelVisible
        isLabelEyebrow
        options={optionsFor(widths, 'widths', t)}
        value={settings.lineWidth}
        onChange={(value) => change({ lineWidth: value as ReadingLineWidth })}
      />
    </>
  );
}

/** Time left: the minutes in the chapter bar (the default) or the pill on the page (CALM-5). */
function TimeLeftChoice({ settings, change }: ChoicesProps) {
  const { t } = useTranslation('reading');
  const options: { value: ReadingTimeLeftPlace; label: string }[] = [
    { value: 'bar', label: t('settings.timeLeftBar') },
    { value: 'page', label: t('settings.timeLeftPage') },
  ];
  return (
    <SegmentedControl
      legend={t('settings.timeLeft')}
      name="reading-time-left"
      options={options}
      value={settings.timeLeft}
      onChange={(value) => change({ timeLeft: value })}
      isFullWidth
    />
  );
}

/** The line at the bottom: saved to the account, or why it wasn't. */
function SaveNote({ saveFailed }: { saveFailed: boolean }) {
  const { t } = useTranslation('reading');
  if (saveFailed) {
    return (
      <p
        role="alert"
        className="m-0 border-t border-hairline pt-4 type-meta leading-normal text-destructive"
      >
        {t('settings.saveFailed')}
      </p>
    );
  }
  return (
    <p className="m-0 flex gap-2 border-t border-hairline pt-4 type-meta leading-normal text-ink-muted">
      <span className="mt-1 flex-none text-(--success-text)">
        <CheckIcon />
      </span>
      {t('settings.saved')}
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
      // In the side column it is its own glass panel; in the sheet the sheet is the glass.
      className={cn('flex flex-col gap-4', !isInSheet && 'glass-pill rounded-card p-6')}
    >
      <div className="flex items-center justify-between gap-2">
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
      <FontChoice settings={settings} change={change} />
      <TextSizeSlider
        chosenSize={settings.textSize}
        deviceSize={deviceSize}
        onChange={(size) => change({ textSize: size })}
      />
      <SettingChoices settings={settings} change={change} />
      <ThemeChoice settings={settings} change={change} chapterCode={chapterCode} />
      <ReadingComfortFields settings={settings} change={change} />
      <TimeLeftChoice settings={settings} change={change} />
      <SaveNote saveFailed={saveFailed} />
    </section>
  );
}
