/**
 * useFirstVisitLanguage: on a first visit, shows the site in the language for the visitor's
 * country (bundle MARKETS-2, part a; story S1-E11-31; the rule is in ../lib/firstVisitLanguage.ts).
 *
 * It runs once per page load and only while this browser holds no language choice: a language the
 * visitor picked, or their account's language (useAccountLanguage saves it to this browser), always
 * wins. It doesn't save its own answer, so when staff later open Swedish, a Swedish visitor who
 * never picked a language gets Swedish on their next visit.
 * Who calls it: AppLayout, once for the whole app. What it calls: /api/signup-context for the
 * connection's country (the country is never stored here), the languages table for the open
 * languages, then i18next to switch the screen.
 */
import { useContext, useEffect } from 'react';
import { I18nContext } from 'react-i18next';

import { fetchSignupCountry } from '@/features/auth/api/signupContext';
import { hasDeviceLanguage } from '@/lib/language-preference';
import type { InterfaceLanguage } from '@/schemas/interfaceLanguages';

import { languageChoiceCount } from '../api/profileLocale';
import { firstVisitLanguage } from '../lib/firstVisitLanguage';
import { alwaysOpenLanguages, fetchOpenInterfaceLanguages } from './useOpenInterfaceLanguages';

/**
 * Reads the open interface languages once, for the hint.
 *
 * @returns the open languages; the two always open ones when the read fails
 */
async function readOpenLanguages(): Promise<readonly InterfaceLanguage[]> {
  try {
    return await fetchOpenInterfaceLanguages();
  } catch {
    return alwaysOpenLanguages;
  }
}

/** Shows a first-time visitor the language for their country. */
export function useFirstVisitLanguage(): void {
  // The one translation instance, as in useAccountLanguage (a stable object across changes).
  const { i18n } = useContext(I18nContext);
  useEffect(() => {
    let isMounted = true;
    // Step 1: a browser that already holds a choice keeps it; nothing to ask.
    if (hasDeviceLanguage()) return undefined;
    const choicesBefore = languageChoiceCount();
    async function applyHint() {
      // Step 2: the country and the open languages, side by side.
      const [{ country }, openLanguages] = await Promise.all([
        fetchSignupCountry(),
        readOpenLanguages(),
      ]);
      // Step 3: the visitor (or their account) may have chosen while we asked; that choice wins.
      if (!isMounted || hasDeviceLanguage() || languageChoiceCount() !== choicesBefore) return;
      const hinted = firstVisitLanguage(country, openLanguages);
      if (hinted !== null && i18n.language !== hinted) await i18n.changeLanguage(hinted);
    }
    // A failed hint is not worth telling anyone about: the page simply stays in the default.
    void applyHint().catch(() => undefined);
    return () => {
      isMounted = false;
    };
  }, [i18n]);
}
