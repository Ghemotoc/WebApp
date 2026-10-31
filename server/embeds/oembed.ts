/**
 * The oEmbed lookup: asks a music or video service for the title of the song or video a writer
 * linked (story S1-E3-10 criterion 1: "using the service's oEmbed data fetched by our server").
 *
 * Only our server asks, never the reader's browser, so a reader's visit tells the service nothing
 * (criterion 2). Two ways to answer, chosen by OEMBED:
 * - "real": the service's own oEmbed address (YouTube, Vimeo, Loom and Spotify publish one; Apple
 *   Music doesn't, so its cards carry no title and the card names the service instead);
 * - "stub" (local work and the tests): no network at all. A link containing "notfound" is answered
 *   as missing and one containing "down" as unreachable; anything else gets "Test <service> title".
 * Nothing here logs the link or who added it (CLAUDE.md rule 12).
 * Who calls it: server/embeds.ts.
 */
import {
  EMBED_SERVICE_NAMES,
  type EmbedService,
  type ParsedEmbedLink,
} from '../../src/lib/embed-links';

/** What a lookup found. */
export type OembedAnswer =
  | { outcome: 'found'; title: string | null; authorName: string | null }
  | { outcome: 'not_found' }
  | { outcome: 'unreachable' };

/** A function that looks one link up. */
export type LookUpOembed = (link: ParsedEmbedLink) => Promise<OembedAnswer>;

/** Each service's oEmbed address; null where the service publishes none. */
const oembedEndpoints: Record<EmbedService, string | null> = {
  youtube: 'https://www.youtube.com/oembed?format=json&url=',
  vimeo: 'https://vimeo.com/api/oembed.json?url=',
  loom: 'https://www.loom.com/v1/oembed?url=',
  spotify: 'https://open.spotify.com/oembed?url=',
  apple_music: null,
};

/**
 * A text field from the oEmbed answer, trimmed to what the card keeps.
 *
 * @param answer - the parsed JSON
 * @param field - "title" or "author_name"
 * @returns the text, or null when it isn't there
 */
function textField(answer: unknown, field: string): string | null {
  if (answer === null || typeof answer !== 'object') return null;
  const value = (answer as Record<string, unknown>)[field];
  if (typeof value !== 'string' || value.trim() === '') return null;
  return value.trim().slice(0, 200);
}

/**
 * Asks the real service.
 *
 * @param link - the understood link
 * @returns found with the title and author; not_found for a 401, 403 or 404 (private, removed or
 *   never there); unreachable for anything else
 */
export async function lookUpWithService(link: ParsedEmbedLink): Promise<OembedAnswer> {
  const endpoint = oembedEndpoints[link.service];
  if (endpoint === null) return { outcome: 'found', title: null, authorName: null };
  const response = await fetch(`${endpoint}${encodeURIComponent(link.sourceUrl)}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(5000),
  }).catch(() => null);
  if (response === null) return { outcome: 'unreachable' };
  if ([401, 403, 404].includes(response.status)) return { outcome: 'not_found' };
  if (!response.ok) return { outcome: 'unreachable' };
  const answer: unknown = await response.json().catch(() => null);
  return {
    outcome: 'found',
    title: textField(answer, 'title'),
    authorName: textField(answer, 'author_name'),
  };
}

/**
 * The stand-in: never leaves the server.
 *
 * @param link - the understood link
 * @returns the answer the rule above gives
 */
export function lookUpWithStub(link: ParsedEmbedLink): Promise<OembedAnswer> {
  const lowerCaseLink = link.sourceUrl.toLowerCase();
  if (lowerCaseLink.includes('notfound')) return Promise.resolve({ outcome: 'not_found' });
  if (lowerCaseLink.includes('down')) return Promise.resolve({ outcome: 'unreachable' });
  return Promise.resolve({
    outcome: 'found',
    title: `Test ${EMBED_SERVICE_NAMES[link.service]} title`,
    authorName: 'Test channel',
  });
}

/**
 * Picks the lookup for the OEMBED setting.
 *
 * @param mode - "real" for the services; anything else is the stub
 * @returns the lookup function
 */
export function oembedLookup(mode: string | undefined): LookUpOembed {
  return mode === 'real' ? lookUpWithService : lookUpWithStub;
}
