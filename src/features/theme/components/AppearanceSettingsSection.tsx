/**
 * AppearanceSettingsSection: Settings › Appearance, where a member picks their theme and light or
 * night mode (bundle G2 THEMES; design/boards Settings.dc.html, "Appearance"; handoff "Themes:
 * members choose their look"; the seasonal switch was removed in the flat themes bundle), whether
 * the app stays still ("Less motion", bundle MOTION-1; Robert, 13 Nov 2026) and whether
 * it is drawn in high contrast ("High contrast", bundle CONTRAST-1; Robert, 13 Nov 2026).
 *
 * Every choice shows at once and is saved on the account, so it follows the member to every
 * device they sign in on (set_my_appearance); this device remembers it too, so the next visit
 * draws it before anything loads (public/theme-init.js). A short line under the choices says
 * whether the last change was saved, or kept on this device only when the save failed.
 * Rules: six themes, Lilac mist by default;
 * night mode is the same with every theme (Robert, 7 Nov 2026; handoff "Design tokens and
 * themes"). "Less motion" is off by default; on a device that already asks for reduced motion
 * it shows as on and can't be switched off here, because the device's setting always counts
 * (WCAG 2.2, 2.3.3). "High contrast" works the same way: off by default, and fixed on where the
 * device asks for more contrast; it keeps the chosen theme in its deep accent on plain white
 * pages, black at night (WCAG 2.2, 1.4.6).
 * Who shows it: the Appearance group of Settings (SettingsGroupPanel). What it calls:
 * useAppearance, LookTiles, ModeChoice, LessMotionRow and HighContrastRow.
 */

import { Eyebrow } from '@/components/ui/Eyebrow';

import { useAppearanceTranslation } from '../registerAppearanceTranslations';
import { useAppearance, type AppearanceSaveState } from '../hooks/useAppearance';

import { HighContrastRow } from './HighContrastRow';
import { LessMotionRow } from './LessMotionRow';
import { LookTiles } from './LookTiles';
import { ModeChoice } from './ModeChoice';

/** The line each save state shows; nothing before the first change or while signed out. */
const saveStateKey: Partial<Record<AppearanceSaveState, string>> = {
  saving: 'saving',
  saved: 'saved',
  failed: 'saveFailed',
};

/**
 * Renders the section.
 *
 * @returns the section
 */
export function AppearanceSettingsSection() {
  const { t } = useAppearanceTranslation();
  const { appearance, change, saveState } = useAppearance();
  const stateKey = saveStateKey[saveState];
  return (
    <section
      id="appearance"
      aria-labelledby="settings-appearance-heading"
      className="flex scroll-mt-24 flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-card"
    >
      <div className="flex flex-col gap-2">
        <Eyebrow>{t('eyebrow')}</Eyebrow>
        <h2
          id="settings-appearance-heading"
          className="m-0 font-heading type-heading font-bold text-ink-heading"
        >
          {t('heading')}
        </h2>
        <p className="m-0 text-ink-muted">{t('intro')}</p>
      </div>
      <LookTiles picked={appearance.look} onPick={(look) => void change({ look })} />
      <ModeChoice picked={appearance.mode} onPick={(mode) => void change({ mode })} />
      <LessMotionRow
        isOn={appearance.isLessMotionOn}
        onToggle={() => void change({ isLessMotionOn: !appearance.isLessMotionOn })}
      />
      <HighContrastRow
        isOn={appearance.isHighContrastOn}
        onToggle={() => void change({ isHighContrastOn: !appearance.isHighContrastOn })}
      />
      <p className="m-0 type-meta text-ink-muted">{t('nightNote')}</p>
      {/* Where the last change stands, read out politely by screen readers. */}
      <p role="status" className="m-0 min-h-5 type-meta text-ink-muted">
        {stateKey === undefined ? '' : t(stateKey)}
      </p>
    </section>
  );
}
