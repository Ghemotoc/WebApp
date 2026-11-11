/**
 * useLanguageOptions: the choices for a language menu, one per open interface language, each named
 * in its own language with a lang attribute so screen readers pronounce it right (WCAG 3.1.2)
 * (bundle MARKETS-2, part a; story S1-E11-31).
 *
 * Who calls it: LanguageSelect (the footer), LanguageSettingsSection (Settings) and NameStep
 * (onboarding), so the three menus can't drift apart. What it calls: useOpenInterfaceLanguages()
 * and the names in common.json (language.en, language.ro, language.sv, language.da, language.nb).
 */
import { useTranslation } from 'react-i18next';

import type { InterfaceLanguage } from '@/schemas/interfaceLanguages';

import { useOpenInterfaceLanguages } from './useOpenInterfaceLanguages';

/** One choice in a language menu. */
export interface LanguageOption {
  /** The language code the menu sends back. */
  value: InterfaceLanguage;
  /** The language's own name ("Svenska", "Română"). */
  label: string;
  /** The same code, so the name is read in its own language. */
  lang: InterfaceLanguage;
}

/**
 * Lists the menu's choices.
 *
 * @returns one choice per open interface language, in the menus' order (English first)
 */
export function useLanguageOptions(): LanguageOption[] {
  const { t } = useTranslation();
  const openLanguages = useOpenInterfaceLanguages();
  return openLanguages.map((code) => ({ value: code, label: t(`language.${code}`), lang: code }));
}
