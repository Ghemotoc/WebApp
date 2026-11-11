/**
 * useInterfaceLanguages: the languages a shared website page can be written in (bundle LOCALISE-1).
 *
 * One page is translated into each interface language (languages.is_interface); English is the
 * main one, so it comes first: a translation's empty fields show the English text.
 * Who calls it: PagePlacePicker and WebsiteAdminPage. What it calls: the public languages table.
 */
import { useQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

/** The main language: every translation falls back to it (LOCALISE-1). */
export const mainContentLanguage = 'en';

/**
 * Puts the main language first and the others in the order of their codes.
 *
 * @param codes - the interface languages' codes
 * @returns the codes in picker order
 */
export function inPickerOrder(codes: string[]): string[] {
  const others = codes.filter((code) => code !== mainContentLanguage).sort();
  return codes.includes(mainContentLanguage) ? [mainContentLanguage, ...others] : others;
}

/**
 * Follows the interface languages.
 *
 * @returns the language codes, English first; only English while loading or when the read fails
 */
export function useInterfaceLanguages(): string[] {
  const languages = useQuery({
    queryKey: ['website-interface-languages'],
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      // Step 1: the languages the interface has, from the public list.
      const client = await requireClient();
      const { data, error } = await client
        .from('languages')
        .select('code')
        .eq('is_interface', true);
      if (error !== null) throw new Error(error.message);
      // Step 2: English first.
      return inPickerOrder(data.map((row) => row.code));
    },
  });
  return languages.data ?? [mainContentLanguage];
}
