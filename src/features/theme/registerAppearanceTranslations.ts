/**
 * Adds the text of Settings › Appearance (the "appearance" namespace) to the translations when
 * the section first renders (bundle MOTION-1). Only the Settings page shows it, so its text stays
 * out of the first page's download and the chapter reader's script budget (S1-E4-01b), as the
 * settings and safety namespaces do. The footer's Mode drop-down keeps its few words in common.
 * Who calls it: AppearanceSettingsSection, LessMotionRow, LookTiles and ModeChoice, through the hook.
 * What it calls: src/lib/namespace-translations.ts.
 */
import { createNamespaceTranslations } from '@/lib/namespace-translations';
import englishAppearance from '@/locales/en/appearance.json';
import romanianAppearance from '@/locales/ro/appearance.json';

const appearanceTranslations = createNamespaceTranslations(
  'appearance',
  romanianAppearance,
  englishAppearance,
);

/**
 * Registers the appearance texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export const registerAppearanceTranslations = appearanceTranslations.register;

/**
 * useTranslation('appearance'), after making sure the texts are registered.
 *
 * @returns the usual translation helpers for the appearance namespace
 */
export const useAppearanceTranslation = appearanceTranslations.useNamespaceTranslation;
