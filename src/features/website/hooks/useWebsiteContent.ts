/**
 * useWebsiteContent: the live website content of one kind for this visitor (stories S1-E11-06,
 * S1-E11-10, S1-E11-12 and S1-E5-08).
 *
 * Who calls it: the public home page, the notice strip and Help.
 * What it calls: useVisitorCountry (the country from the connection, S1-E2-10) and the
 * WebsiteContentStore's readLive(), then parses each entry with its zod schema from
 * src/schemas/websiteContent.ts and leaves out anything that doesn't fit (a draft can't reach
 * here, but an older shape could). A failed read falls back to the last copy this browser saw
 * (lib/lastKnownContent.ts); the query also keeps its last good answer while it reads again.
 */
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { ZodType } from 'zod';

import { useVisitorCountry } from '@/features/safety/hooks/useVisitorCountry';
import { getSupabaseClient } from '@/lib/supabase';
import type { WebsiteContentKind } from '@/schemas/websiteContent';

import { appDatabaseReader, type LiveEntry } from '../api/websiteContentStore';
import { recallContent, rememberContent } from '../lib/lastKnownContent';

/** How long a read stays fresh: a publish shows within a minute (S1-E11-06 criterion 6). */
const contentFreshMilliseconds = 60 * 1000;

/** One live entry with its content parsed. */
export interface ParsedEntry<Content> extends Omit<LiveEntry, 'content'> {
  content: Content;
}

/**
 * Parses each entry, leaving out any whose content doesn't fit the schema.
 *
 * @param entries - the rows as read or recalled
 * @param schema - the kind's schema
 * @returns the entries that fit
 */
function parseEntries<Content>(entries: unknown, schema: ZodType<Content>): ParsedEntry<Content>[] {
  if (!Array.isArray(entries)) return [];
  const parsed: ParsedEntry<Content>[] = [];
  for (const entry of entries as LiveEntry[]) {
    const result = schema.safeParse(entry.content);
    if (result.success) parsed.push({ ...entry, content: result.data });
  }
  return parsed;
}

/**
 * Reads the live entries of one kind.
 *
 * @param kind - for example 'question'
 * @param schema - the kind's zod schema
 * @param options.enabled - false waits without reading (the rules walkthrough reads its cards only
 *   for someone who will see them, MUST-1c); true when left out
 * @returns entries (empty while loading), isLoaded and readFailed (true only when even the saved
 *   copy is missing)
 */
export function useWebsiteContent<Content>(
  kind: WebsiteContentKind,
  schema: ZodType<Content>,
  options: { enabled?: boolean } = {},
) {
  const { i18n } = useTranslation();
  const { countryCode, isKnown } = useVisitorCountry();
  const language = i18n.resolvedLanguage ?? 'ro';
  const cacheKey = `${kind}:${countryCode ?? 'none'}:${language}`;
  const content = useQuery<LiveEntry[]>({
    queryKey: ['website-content', kind, countryCode, language],
    enabled: isKnown && options.enabled !== false,
    staleTime: contentFreshMilliseconds,
    refetchInterval: contentFreshMilliseconds,
    queryFn: async () => {
      // Step 1: read through the store, then keep a copy for a day the read fails.
      const client = await getSupabaseClient();
      if (client === null) throw new Error('The app is not connected to its database.');
      const entries = await appDatabaseReader(client).readLive(kind, {
        country: countryCode,
        language,
      });
      rememberContent(cacheKey, entries);
      return entries;
    },
  });
  // Step 2: the read's answer, or the saved copy when the read failed before any answer came.
  const source = content.data ?? (content.isError ? recallContent(cacheKey) : null);
  const entries = parseEntries(source, schema);
  return {
    entries,
    isLoaded: content.isSuccess || (content.isError && source !== null),
    readFailed: content.isError && source === null,
  };
}
