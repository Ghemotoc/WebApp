/**
 * LanguageSettingsSection: the Language panel in Settings (story S1-E1-04; design/boards/
 * Settings.dc.html, its Language tab; bundle FIX-3).
 *
 * Robert, 9 Nov 2026, 12:20 UTC: the language menu sits only in the footer and in Settings, never
 * in the top bar (replaces Q11, "a drop-down in both the top bar and the footer"). This panel is
 * the Settings half: the interface languages as one row of radio buttons, each named in its own
 * language with a lang attribute so screen readers pronounce it right (WCAG 3.1.2), then the line
 * that says where the choice was saved, then the board's note about signed-out visitors and story
 * languages.
 * Who shows it: SettingsGroupPanel, in the Language group (/settings#language).
 * What it calls: useInterfaceLanguage, which switches the screen, keeps the choice in this browser
 * and saves it to the account, the same as the footer's drop-down.
 */
import { useTranslation } from 'react-i18next';

import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { isSupportedLanguage } from '@/lib/i18n';

import { useInterfaceLanguage, type LanguageSaveStatus } from '../hooks/useInterfaceLanguage';
import { useLanguageOptions } from '../hooks/useLanguageOptions';

/** The line each save result shows; nothing before a choice is made. */
const saveMessageKeys: Record<LanguageSaveStatus, string | null> = {
  idle: null,
  savedToAccount: 'language.savedToAccount',
  keptOnDevice: 'language.keptOnDevice',
};

/**
 * Renders the panel.
 *
 * @returns the section headed "Language"
 */
export function LanguageSettingsSection() {
  const { t } = useTranslation();
  const { language, changeLanguage, saveStatus } = useInterfaceLanguage();

  // Step 1: one radio button per open language, labelled in that language ("English", "Română";
  // a Nordic language only once staff open it, MARKETS-2a).
  const options = useLanguageOptions();
  const messageKey = saveMessageKeys[saveStatus];

  return (
    <section
      id="language"
      aria-labelledby="settings-language-heading"
      className="flex scroll-mt-24 flex-col gap-5 rounded-card border border-border bg-surface p-6 shadow-card"
    >
      <div className="flex flex-col gap-1.5">
        <h2
          id="settings-language-heading"
          className="m-0 font-heading text-[22px] font-bold text-heading"
        >
          {t('language.settingsHeading')}
        </h2>
        <p className="m-0 text-body">{t('language.settingsIntro')}</p>
      </div>
      <SegmentedControl
        legend={t('language.settingsLegend')}
        isLegendVisible={false}
        name="settings-language"
        options={options}
        value={language}
        onChange={(value) => {
          // Step 2: the control only offers our languages; the check keeps TypeScript sure.
          if (isSupportedLanguage(value)) void changeLanguage(value);
        }}
      />
      {/* Step 3: where the choice was saved, read out politely by screen readers. The line stays
          in the page while empty, so the announcement is heard; empty, it has no height. */}
      <div className="flex flex-col gap-1">
        <p role="status" className="m-0 text-[13px] text-body">
          {messageKey === null ? '' : t(messageKey)}
        </p>
        <p className="m-0 text-[13px] text-meta">{t('language.settingsNote')}</p>
      </div>
    </section>
  );
}
