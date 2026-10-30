/**
 * ReadingSettingsPanel: the "Reading settings" card under the chapter bar's button (story
 * S1-E4-02; board 3.5 Reader).
 *
 * Board values: a white 24 px-radius card about 360 px wide with the heading and a close button,
 * then Font, Text size, Line spacing, Line width and Theme, and a line saying the settings are
 * saved to the account. Every change shows on the chapter at once. No doodles: this is the
 * chapter reader (DoD design rules). The board's "Later, in the apps: any font on your device"
 * block is left out until the desktop and phone apps exist (docs/board-fixes.md).
 * Who uses it: ReadingSettingsControl. What it calls: useReadingSettings (the reader's
 * settings), which saves to the account.
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { CheckIcon } from '@/components/icons/CheckIcon';
import { ChoiceChips } from '@/components/ui/ChoiceChips';

import type {
  ReadingFont,
  ReadingLineSpacing,
  ReadingLineWidth,
  ReadingSettings,
  ReadingTheme,
} from '../api/readingSettings';
import { useReadingSettings } from '../hooks/useReadingSettings';

import { CloseIcon } from './ReaderIcons';
import { TextSizeSlider } from './TextSizeSlider';

/** The choices in the board's order. */
const fonts: ReadingFont[] = ['sans', 'serif', 'dyslexia_friendly'];
const spacings: ReadingLineSpacing[] = ['compact', 'normal', 'wide'];
const widths: ReadingLineWidth[] = ['narrow', 'medium', 'wide'];
const themes: ReadingTheme[] = ['light', 'sepia', 'night'];

/** What the panel needs. */
export interface ReadingSettingsPanelProps {
  id: string;
  /** The size that follows the device. */
  deviceSize: number;
  onClose: () => void;
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

/** The other three groups of chips: line spacing, line width and theme. */
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
      <ChoiceChips
        label={t('settings.theme')}
        isLabelVisible
        isLabelEyebrow
        options={optionsFor(themes, 'themes', t)}
        value={settings.theme}
        onChange={(value) => change({ theme: value as ReadingTheme })}
      />
    </>
  );
}

/** The line at the bottom: saved to the account, or why it wasn't. */
function SaveNote({ saveFailed }: { saveFailed: boolean }) {
  const { t } = useTranslation('reading');
  if (saveFailed) {
    return (
      <p
        role="alert"
        className="m-0 border-t border-hairline pt-3.5 text-[13px] leading-normal text-destructive"
      >
        {t('settings.saveFailed')}
      </p>
    );
  }
  return (
    <p className="m-0 flex gap-2 border-t border-hairline pt-3.5 text-[13px] leading-normal text-body">
      <span className="mt-0.5 flex-none text-(--success-text)">
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
export function ReadingSettingsPanel({ id, deviceSize, onClose }: ReadingSettingsPanelProps) {
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
      className="tmc-rise absolute top-14 left-0 z-[5] flex w-[min(360px,calc(100vw-32px))] flex-col gap-[18px] rounded-card border border-border bg-surface p-[22px] shadow-popover"
    >
      <div className="flex items-center justify-between gap-2">
        <h2
          id={`${id}-title`}
          tabIndex={-1}
          className="m-0 font-heading text-xl font-bold text-heading outline-none"
        >
          {t('settings.title')}
        </h2>
        <button
          type="button"
          aria-label={t('settings.close')}
          onClick={onClose}
          className="-mr-2.5 inline-flex size-11 items-center justify-center rounded-full text-body hover:bg-tint"
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
      <SaveNote saveFailed={saveFailed} />
    </section>
  );
}
