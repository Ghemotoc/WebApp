/**
 * The music and video card's server side: turns a link the writer pasted into a card in their
 * chapter (story S1-E3-10 criterion 1; ADR 0008).
 *
 * What it does, in order:
 * 1. checks the request against the shared schema (src/schemas/embed.ts) and takes the caller's
 *    own sign-in token: no service key is ever used (CLAUDE.md rule 2);
 * 2. reads the link with src/lib/embed-links.ts: only Spotify, Apple Music, YouTube, Vimeo and
 *    Loom are allowed, and only in their known shapes;
 * 3. asks the service's oEmbed for the title (server/embeds/oembed.ts), so the reader's browser
 *    never has to;
 * 4. saves the card through register_chapter_embed() as the caller, which checks the flag, the
 *    account, that the chapter is theirs and the hourly limit.
 * Nothing about the link or the person is logged (CLAUDE.md rule 12).
 * Who calls it: functions/api/embed.ts on Cloudflare, server/pages-functions-plugin.ts locally;
 * the Add music or video dialog calls POST /api/embed.
 */
import { parseEmbedLink, type ParsedEmbedLink } from '../src/lib/embed-links';
import { embedRequestSchema, type EmbedFailure, type EmbedResponse } from '../src/schemas/embed';

import type { LookUpOembed } from './embeds/oembed';
import { bearerToken } from './picture-check';

/** What the handler needs from its surroundings. */
export interface EmbedOptions {
  supabaseUrl: string;
  anonKey: string;
  lookUpOembed: LookUpOembed;
}

/** What register_chapter_embed() said, as the handler answers it. */
type SaveResult = { embedId: string } | { failure: EmbedFailure; waitMinutes?: number };

/** The answer's HTTP status for each failure. */
const statusForFailure: Record<EmbedFailure, number> = {
  invalid: 400,
  signed_out: 401,
  account: 403,
  switched_off: 403,
  chapter_not_found: 404,
  not_found: 404,
  not_allowed: 422,
  too_many: 429,
  unreachable: 503,
};

/**
 * A JSON answer that no cache keeps.
 *
 * @returns the response
 */
function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

/**
 * Reads the database's refusal as one of the dialog's reasons.
 *
 * @param refusal - PostgREST's error body: the SQLSTATE code and the hint
 * @returns the reason, with the minutes to wait for the hourly limit
 */
export function failureFromRefusal(refusal: { code?: string; hint?: string | null }): {
  failure: EmbedFailure;
  waitMinutes?: number;
} {
  if (refusal.code === '0A000') return { failure: 'switched_off' };
  if (refusal.code === '42501') return { failure: 'account' };
  if (refusal.code === '23514') return { failure: 'chapter_not_found' };
  if (refusal.code === '54000') {
    const minutes = Number(/wait_minutes:(\d+)/.exec(refusal.hint ?? '')?.[1] ?? '60');
    return { failure: 'too_many', waitMinutes: minutes };
  }
  return { failure: 'unreachable' };
}

/**
 * Saves the card as the caller.
 *
 * @returns the new card's ID, or why it wasn't saved
 */
async function saveCard(
  options: EmbedOptions,
  token: string,
  request: {
    chapterId: string;
    link: ParsedEmbedLink;
    title: string | null;
    authorName: string | null;
  },
): Promise<SaveResult> {
  const response = await fetch(`${options.supabaseUrl}/rest/v1/rpc/register_chapter_embed`, {
    method: 'POST',
    headers: {
      apikey: options.anonKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      target_chapter_id: request.chapterId,
      embed_service: request.link.service,
      embed_media_path: request.link.mediaPath,
      embed_source_url: request.link.sourceUrl,
      embed_title: request.title,
      embed_author_name: request.authorName,
    }),
  }).catch(() => null);
  if (response === null) return { failure: 'unreachable' };
  const answer: unknown = await response.json().catch(() => null);
  if (response.ok && typeof answer === 'string') return { embedId: answer };
  return failureFromRefusal((answer ?? {}) as { code?: string; hint?: string | null });
}

/**
 * Answers POST /api/embed.
 *
 * @param request - the request with { chapterId, link } and the caller's token
 * @param options - the database and the oEmbed lookup
 * @returns 200 with the card (EmbedResponse); otherwise { error, waitMinutes? } with the status in
 *   statusForFailure
 * Errors: none thrown; nothing is logged.
 */
export async function handleEmbed(request: Request, options: EmbedOptions): Promise<Response> {
  const fail = (failure: EmbedFailure, waitMinutes?: number) =>
    json({ error: failure, waitMinutes }, statusForFailure[failure]);
  // Step 1: the schema and the token.
  const parsed = embedRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail('invalid');
  const token = bearerToken(request);
  if (token === null) return fail('signed_out');
  // Step 2: an allowed link only (criterion 1).
  const link = parseEmbedLink(parsed.data.link);
  if (link === null) return fail('not_allowed');
  // Step 3: the title from the service, asked by us.
  const oembed = await options.lookUpOembed(link);
  if (oembed.outcome !== 'found') return fail(oembed.outcome);
  // Step 4: the card, saved as the writer.
  const saved = await saveCard(options, token, {
    chapterId: parsed.data.chapterId,
    link,
    title: oembed.title,
    authorName: oembed.authorName,
  });
  if ('failure' in saved) return fail(saved.failure, saved.waitMinutes);
  const card: EmbedResponse = {
    embedId: saved.embedId,
    service: link.service,
    mediaPath: link.mediaPath,
    title: oembed.title,
    authorName: oembed.authorName,
  };
  return json(card, 200);
}
