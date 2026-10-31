/**
 * useInterfaceLanguage: the language on screen, and changing it (story S1-E1-04).
 *
 * Who calls it: LanguageSelect, the drop-down in the top bar and in the footer. Both share the one
 * translation instance, so changing one changes the other at once.
 * What it calls, in this order, when the person picks a language:
 *   1. i18next, so the whole screen switches straight away;
 *   2. src/lib/language-preference.ts, so this browser opens in it next time;
 *   3. when someone is signed in, api/profileLocale.ts, so every device they use opens in it.
 */
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { defaultLanguage, isSupportedLanguage, type SupportedLanguage } from '@/lib/i18n';
import { saveDeviceLanguage } from '@/lib/language-preference';
import { getSupabaseClient } from '@/lib/supabase';
import { trackEvent } from '@/lib/analytics/track';

import { hasSignedInSession, saveAccountLanguage, startLanguageChoice } from '../api/profileLocale';

/**
 * What happened to the last choice: nothing yet (or signed out, kept in this browser),
 * saved to the account, or kept in this browser only because the account save failed.
 */
export type LanguageSaveStatus = 'idle' | 'savedToAccount' | 'keptOnDevice';

/**
 * Saves a language to the signed-in account. On failure the screen keeps the new language and
 * the drop-down says it's kept on this device only.
 *
 * @param nextLanguage - the language just picked
 * @returns the drop-down's status: idle when signed out, savedToAccount or keptOnDevice
 */
async function saveToAccount(nextLanguage: SupportedLanguage): Promise<LanguageSaveStatus> {
  try {
    const client = await getSupabaseClient();
    // Signed out (or no Supabase settings): this browser is the only place to keep it.
    if (client === null || !(await hasSignedInSession(client))) return 'idle';
    await saveAccountLanguage(client, nextLanguage);
    return 'savedToAccount';
  } catch (error) {
    console.warn(error instanceof Error ? error.message : 'Could not save the account language.');
    return 'keptOnDevice';
  }
}

/**
 * Gives the current language and a way to change it.
 *
 * @returns language: what is on screen; changeLanguage: switches and saves; saveStatus: the result
 *   of the last save, for the drop-down's message
 */
export function useInterfaceLanguage() {
  const { i18n } = useTranslation();
  const [saveStatus, setSaveStatus] = useState<LanguageSaveStatus>('idle');

  // What is on screen now. resolvedLanguage is always one of ours; the check keeps TypeScript sure.
  const language = isSupportedLanguage(i18n.resolvedLanguage)
    ? i18n.resolvedLanguage
    : defaultLanguage;

  const changeLanguage = useCallback(
    async (nextLanguage: SupportedLanguage) => {
      // Step 0: note the choice at once, so a slow read of the account's language can't switch
      // it back while this one is being saved (profileLocale.ts).
      const finishChoice = startLanguageChoice();
      try {
        // Steps 1 and 2: switch the screen and remember the choice in this browser.
        await i18n.changeLanguage(nextLanguage);
        saveDeviceLanguage(nextLanguage);
        // The analytics event carries the new language only (docs/analytics-events.md).
        trackEvent('language_changed', { language: nextLanguage });
        // Step 3: when someone is signed in, save it to the account.
        setSaveStatus(await saveToAccount(nextLanguage));
      } finally {
        finishChoice();
      }
    },
    [i18n],
  );

  return { language, changeLanguage, saveStatus };
}
