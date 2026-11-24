/**
 * ReadingSettingsChoices: the rows at the top of Reading settings, in the board's order: Paper,
 * Night mode, Typeface and Time left (BOOKS B04, user story 2.4; board B04-ReaderSettings, design
 * files day v25 and night v24). Text size sits between Typeface and Time left (TextSizeSlider).
 *
 * Values from the board: each row has a 1 px hairline on top and 12 px above and below; Paper and
 * Typeface are segmented controls of two lines of two, the picked one on the white bubble; Night
 * mode is a switch whose words say what it does; Time left has its hint under its name. Every
 * change shows on the open chapter at once and is remembered (useReadingSettings).
 * Who uses it: ReadingSettingsPanel. What it calls: SegmentedControl, Switch, useChapterPaper
 * (a paper picked while Night by the clock decides) and useNightMode (the site's Night mode, the
 * same one as the footer's button).
 */
import { useTranslation } from 'react-i18next';

import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Switch } from '@/components/ui/Switch';
import { useNightMode } from '@/features/theme/hooks/useNightMode';

import type {
  ReadingFont,
  ReadingPaper,
  ReadingSettings,
  ReadingTimeLeftPlace,
} from '../api/readingSettings';
import { pickPaperForChapter, useChapterPaper } from '../hooks/useChapterPaper';

/** The choices in the board's order. */
const papers: ReadingPaper[] = ['white', 'sepia', 'grey', 'black'];
const typefaces: ReadingFont[] = ['serif', 'sans', 'dyslexia_friendly', 'atkinson_hyperlegible'];

/** The row style every setting shares: a hairline on top, 12 px above and below. */
export const settingsRowClass = 'flex flex-col gap-2 border-t border-hairline py-3';

/** What a row of choices needs. */
export interface ChoicesProps {
  settings: ReadingSettings;
  change: (changes: Partial<ReadingSettings>) => void;
}

/**
 * Paper: White, Sepia, Grey or Black, beside its name. While Night by the clock has turned the
 * chapter Black, a pick counts for this chapter only, so the usual paper stays as it was.
 *
 * @returns the Paper row
 */
export function PaperChoice({
  settings,
  change,
  chapterCode,
}: ChoicesProps & { chapterCode: string }) {
  const { t } = useTranslation('reading');
  const { paper, isClockNight } = useChapterPaper(settings, chapterCode);
  const pick = (picked: ReadingPaper) => {
    // While the clock decides, the pick wins until the next chapter; otherwise it is the usual paper.
    if (isClockNight) pickPaperForChapter(chapterCode, picked);
    else change({ paper: picked });
  };
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-hairline py-3">
      {/* The name shows beside the choices; screen readers hear it as the group's name. */}
      <span aria-hidden="true" className="type-label text-ink-heading">
        {t('settings.paper')}
      </span>
      <SegmentedControl
        legend={t('settings.paper')}
        isLegendVisible={false}
        name="reading-paper"
        columns={2}
        options={papers.map((value) => ({ value, label: t(`settings.papers.${value}`) }))}
        value={paper}
        onChange={pick}
      />
    </div>
  );
}

/**
 * Night mode: the site's own night mode, the same switch as the footer's button, so the whole
 * page goes dark, the paper too (board: "Turns the whole page dark, paper included.").
 *
 * @returns the Night mode row
 */
export function NightModeRow() {
  const { t } = useTranslation('reading');
  const { isNightOn, toggle } = useNightMode();
  return (
    <div className="flex items-center justify-between gap-4 border-t border-hairline py-3">
      <span className="flex min-w-0 flex-col">
        <span aria-hidden="true" className="type-label text-ink-heading">
          {t('settings.nightMode')}
        </span>
        <span id="reading-night-mode-hint" className="type-meta text-ink-muted">
          {t('settings.nightModeHint')}
        </span>
      </span>
      <Switch
        label={t('settings.nightMode')}
        isOn={isNightOn}
        onToggle={toggle}
        describedBy="reading-night-mode-hint"
      />
    </div>
  );
}

/**
 * Typeface: Literata (the default), Inter, OpenDyslexic or Atkinson Hyperlegible, under its name.
 *
 * @returns the Typeface row
 */
export function TypefaceChoice({ settings, change }: ChoicesProps) {
  const { t } = useTranslation('reading');
  return (
    <div className={settingsRowClass}>
      <SegmentedControl
        legend={t('settings.typeface')}
        name="reading-typeface"
        columns={2}
        options={typefaces.map((value) => ({ value, label: t(`settings.typefaces.${value}`) }))}
        value={settings.font}
        onChange={(value) => change({ font: value })}
      />
    </div>
  );
}

/**
 * Time left: the minutes in the chapter bar (the default) or the pill on the page (CALM-5).
 *
 * @returns the Time left row
 */
export function TimeLeftChoice({ settings, change }: ChoicesProps) {
  const { t } = useTranslation('reading');
  const options: { value: ReadingTimeLeftPlace; label: string }[] = [
    { value: 'bar', label: t('settings.timeLeftBar') },
    { value: 'page', label: t('settings.timeLeftPage') },
  ];
  return (
    <div className={settingsRowClass}>
      <span className="flex flex-col">
        <span aria-hidden="true" className="type-label text-ink-heading">
          {t('settings.timeLeft')}
        </span>
        <span className="type-meta text-ink-muted">{t('settings.timeLeftHint')}</span>
      </span>
      <SegmentedControl
        legend={t('settings.timeLeft')}
        isLegendVisible={false}
        name="reading-time-left"
        columns={2}
        options={options}
        value={settings.timeLeft}
        onChange={(value) => change({ timeLeft: value })}
      />
    </div>
  );
}
