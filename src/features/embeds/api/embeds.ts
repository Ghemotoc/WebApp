/**
 * Music and video cards: adding one from a pasted link, and reading cards for the screens
 * (story S1-E3-10; ADR 0008).
 *
 * Who calls it: the hooks in ../hooks (the Add music or video dialog, the editor's card and the
 * writer's preview) and the reader's chapter (src/features/reading/api/chapter.ts).
 * What it calls next: POST /api/embed (server/embeds.ts), which reads the link, asks the service's
 * oEmbed for the title and saves the card as the writer; the database function my_embeds()
 * (…_s1_e3_10_music_and_video.sql) for the writer's own cards.
 * Nothing here loads anything from the music or video service: that happens only in the reader's
 * player, after play is pressed (ChapterEmbed).
 */
import type { Json } from '@/lib/database.types';
import { isEmbedService, type EmbedService } from '@/lib/embed-links';
import type { AppSupabaseClient } from '@/lib/supabase';
import {
  embedFailureSchema,
  embedResponseSchema,
  type EmbedFailure,
  type EmbedResponse,
} from '@/schemas/embed';

/** One card, as the screens draw it. */
export type EmbedView =
  | {
      state: 'visible';
      service: EmbedService;
      mediaPath: string;
      title: string | null;
      authorName: string | null;
    }
  | { state: 'removed' };

/** Why a card wasn't added, with the minutes to wait for the hourly limit. */
export class EmbedAddError extends Error {
  readonly failure: EmbedFailure;
  readonly waitMinutes: number | undefined;

  /**
   * @param failure - one of the reasons in src/schemas/embed.ts
   * @param waitMinutes - for too_many, how long to wait
   */
  constructor(failure: EmbedFailure, waitMinutes?: number) {
    super(`The card wasn't added: ${failure}`);
    this.name = 'EmbedAddError';
    this.failure = failure;
    this.waitMinutes = waitMinutes;
  }
}

/** What the dialog sends. */
export interface EmbedAddition {
  chapterId: string;
  link: string;
}

/**
 * Adds a card to one of the writer's chapters.
 *
 * @param client - the shared Supabase client (for the sign-in token)
 * @param addition - the chapter and the pasted link
 * @returns the new card: its ID, service, what to play and its title
 * @throws EmbedAddError with the reason, "unreachable" when our server didn't answer
 */
export async function addChapterEmbed(
  client: AppSupabaseClient,
  addition: EmbedAddition,
): Promise<EmbedResponse> {
  const { data } = await client.auth.getSession();
  const token = data.session?.access_token;
  if (token === undefined) throw new EmbedAddError('signed_out');
  const response = await fetch('/api/embed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(addition),
  }).catch(() => null);
  if (response === null) throw new EmbedAddError('unreachable');
  const answer: unknown = await response.json().catch(() => null);
  const card = embedResponseSchema.safeParse(answer);
  if (response.ok && card.success) return card.data;
  const refusal = embedFailureSchema.safeParse(answer);
  if (refusal.success) throw new EmbedAddError(refusal.data.error, refusal.data.waitMinutes);
  throw new EmbedAddError('unreachable');
}

/**
 * A text from the card's JSON, or null.
 *
 * @returns the text when it is a non-empty string
 */
function textOrNull(value: Json | undefined): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

/**
 * One card from the database's JSON (embed_json()).
 *
 * @returns the view, or null for anything that isn't a card
 */
function viewFrom(value: Json | undefined): EmbedView | null {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  if (value.state === 'removed') return { state: 'removed' };
  if (value.state !== 'visible' || !isEmbedService(value.service)) return null;
  const mediaPath = textOrNull(value.media_path);
  if (mediaPath === null) return null;
  return {
    state: 'visible',
    service: value.service,
    mediaPath,
    title: textOrNull(value.title),
    authorName: textOrNull(value.author_name),
  };
}

/**
 * Reads the cards map from get_chapter() or my_embeds().
 *
 * @param json - {"<card ID>": card}
 * @returns the views by card ID; entries that aren't cards are left out
 */
export function embedViewsFromJson(json: Json | null | undefined): Record<string, EmbedView> {
  if (json === null || json === undefined || typeof json !== 'object' || Array.isArray(json)) {
    return {};
  }
  const views: Record<string, EmbedView> = {};
  for (const [embedId, value] of Object.entries(json)) {
    const view = viewFrom(value);
    if (view !== null) views[embedId] = view;
  }
  return views;
}

/**
 * The writer's own cards, for the editor and the preview.
 *
 * @param client - the shared Supabase client
 * @param embedIds - the cards in the text
 * @returns the views by card ID; anyone else's cards are left out by the database
 * Errors: throws when the database can't be reached.
 */
export async function fetchMyEmbeds(
  client: AppSupabaseClient,
  embedIds: string[],
): Promise<Record<string, EmbedView>> {
  if (embedIds.length === 0) return {};
  const { data, error } = await client.rpc('my_embeds', { embed_ids: embedIds });
  if (error !== null) throw new Error(`Could not read the music and video cards: ${error.message}`);
  return embedViewsFromJson(data);
}
