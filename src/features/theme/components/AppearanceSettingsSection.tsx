/**
 * AppearanceSettingsSection: Settings › Appearance, where a member picks their theme, light or
 * night mode, whether the seasonal looks switch on by themselves (bundle G2 THEMES; design/
 * boards Settings.dc.html, "Appearance"; handoff "Themes: members choose their look") and
 * whether the app stays still ("Less motion", bundle MOTION-1; Robert, 13 Nov 2026).
 *
 * Every choice shows at once and is saved on the account, so it follows the member to every
 * device they sign in on (set_my_appearance); this device remembers it too, so the next visit
 * draws it before anything loads (public/theme-init.js). A short line under the choices says
 * whether the last change was saved, or kept on this device only when the save failed.
 * Rules: six year-round themes, Lilac mist by default; the seasonal switch is off by default;
 * night mode is the same with every theme (Robert, 7 Nov 2026; handoff "Design tokens and
 * themes"). "Less motion" is off by default; on a device that already asks for reduced motion
 * it shows as on and can't be switched off here, because the device's setting always counts
 * (WCAG 2.2, 2.3.3).
 * Who shows it: the Appearance group of Settings (SettingsGroupPanel). What it calls:
 * useAppearance, LookTiles, ModeChoice, LessMotionRow and the shared SwitchButton.
 */

import { Eyebrow } from '@/components/ui/Eyebrow';
import { SwitchButton } from '@/features/settings/components/SwitchButton';

import { useAppearanceTranslation } from '../registerAppearanceTranslations';
import { useAppearance, type AppearanceSaveState } from '../hooks/useAppearance';

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
 * The seasonal switch with its name and hint, as one row.
 *
 * @returns the row
 */
function SeasonalRow({ isOn, onToggle }: { isOn: boolean; onToggle: () => void }) {
  const { t } = useAppearanceTranslation();
  return (
    <div className="flex min-h-[52px] items-center justify-between gap-4">
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[15px] font-bold text-ink">{t('seasonalLabel')}</span>
        <span id="appearance-seasonal-hint" className="text-[13px] text-meta">
          {t('seasonalHint')}
        </span>
      </span>
      <SwitchButton
        label={t('seasonalLabel')}
        isOn={isOn}
        stateWord={t(isOn ? 'on' : 'off')}
        isDisabled={false}
        onToggle={onToggle}
      />
    </div>
  );
}

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
      className="flex scroll-mt-24 flex-col gap-5 rounded-card border border-border bg-surface p-6 shadow-card"
    >
      <div className="flex flex-col gap-1.5">
        <Eyebrow>{t('eyebrow')}</Eyebrow>
        <h2
          id="settings-appearance-heading"
          className="m-0 font-heading text-[22px] font-bold text-heading"
        >
          {t('heading')}
        </h2>
        <p className="m-0 text-body">{t('intro')}</p>
      </div>
      <LookTiles picked={appearance.look} onPick={(look) => void change({ look })} />
      <ModeChoice picked={appearance.mode} onPick={(mode) => void change({ mode })} />
      <SeasonalRow
        isOn={appearance.isSeasonalOn}
        onToggle={() => void change({ isSeasonalOn: !appearance.isSeasonalOn })}
      />
      <LessMotionRow
        isOn={appearance.isLessMotionOn}
        onToggle={() => void change({ isLessMotionOn: !appearance.isLessMotionOn })}
      />
      <p className="m-0 text-[13px] text-meta">{t('nightNote')}</p>
      {/* Where the last change stands, read out politely by screen readers. */}
      <p role="status" className="m-0 min-h-5 text-[13px] text-body">
        {stateKey === undefined ? '' : t(stateKey)}
      </p>
    </section>
  );
}
