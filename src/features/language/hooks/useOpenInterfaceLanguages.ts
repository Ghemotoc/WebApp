/**
 * useOpenInterfaceLanguages: the interface languages a person may pick right now (bundle
 * MARKETS-2, part a; story S1-E11-31).
 *
 * The app knows five interface languages (src/schemas/interfaceLanguages.ts), but staff open each
 * one from Staff › Settings, and only with a moderator who reads it (S1-E11-05). A closed language
 * shows in no menu (the brief: "Given the language menu, when a language is closed, then it does
 * not show"). Romanian and English are always open (admin_set_language_status() refuses to close
 * them), so they are the answer while the list loads or when the database can't be reached.
 * Who calls it: useLanguageOptions (the footer, Settings and onboarding menus),
 * LocalisedWebsiteLayout (through useOpenInterfaceLanguagesState()), and
 * useFirstVisitLanguage through fetchOpenInterfaceLanguages(). What it calls: the public languages table (policy languages_select_public: anyone
 * reads it; nothing in it is personal).
 */
import { useQuery } from '@tanstack/react-query';

import { getSupabaseClient } from '@/lib/supabase';
import {
  interfaceLanguages,
  isInterfaceLanguage,
  type InterfaceLanguage,
} from '@/schemas/interfaceLanguages';

/** The two languages that are always open, in the menus' order. */
export const alwaysOpenLanguages: readonly InterfaceLanguage[] = ['en', 'ro'];

/**
 * Reads which interface languages are open.
 *
 * @returns the open ones, in the menus' order
 * @throws Error when the database answers with an error (the hook then keeps the fallback)
 */
export async function fetchOpenInterfaceLanguages(): Promise<InterfaceLanguage[]> {
  // Step 1: no database (a test, or the client didn't start): the two languages always open.
  const client = await getSupabaseClient();
  if (client === null) return [...alwaysOpenLanguages];
  // Step 2: the open interface rows.
  const { data, error } = await client
    .from('languages')
    .select('code')
    .eq('is_interface', true)
    .eq('status', 'open');
  if (error !== null) throw new Error(error.message);
  // Step 3: keep the order of the one list, and only the codes the app has screens for.
  const openCodes = new Set(data.map((row) => row.code).filter(isInterfaceLanguage));
  return interfaceLanguages.filter((code) => openCodes.has(code));
}

/**
 * Follows the open interface languages, and says whether the answer has arrived.
 *
 * @returns languages (Romanian and English until the answer arrives, or when the read fails) and
 *   isKnown (the read finished, well or not), for a caller that must not act on the fallback
 */
export function useOpenInterfaceLanguagesState(): {
  languages: readonly InterfaceLanguage[];
  isKnown: boolean;
} {
  const languages = useQuery({
    queryKey: ['open-interface-languages'],
    queryFn: fetchOpenInterfaceLanguages,
    // Staff open a language rarely; an hour is fresh enough, and a reload picks it up.
    staleTime: 60 * 60 * 1000,
  });
  // A failed read is not shown to anyone: the menu keeps the two languages always open.
  const hasAnswer = languages.data !== undefined && languages.data.length > 0;
  return {
    languages: hasAnswer ? languages.data : alwaysOpenLanguages,
    isKnown: !languages.isPending,
  };
}

/**
 * Follows the open interface languages.
 *
 * @returns the languages to offer; Romanian and English until the answer arrives
 */
export function useOpenInterfaceLanguages(): readonly InterfaceLanguage[] {
  return useOpenInterfaceLanguagesState().languages;
}
