/**
 * Staff › Website › Genre and tag pages: read and change the band colour of each genre and tag
 * page (bundle G12b; the canvas's StaffWebsite board).
 *
 * Who calls it: hooks/useListPageBackgrounds.ts.
 * What it calls next: admin_list_page_backgrounds(), admin_set_list_page_background() and
 * admin_clear_list_page_background(), which check the owner or admin role and write the audit
 * log in the same transaction.
 */
import type { PillTone } from '@/components/ui/InfoPill';
import type { AppSupabaseClient } from '@/lib/supabase';

/** The six band colours, in the order the page offers them. */
export const bandPalettes: readonly PillTone[] = [
  'plum',
  'sage',
  'gold',
  'sky',
  'blush',
  'neutral',
];

/** One saved choice. */
export interface ListBackground {
  kind: 'category' | 'tag';
  /** The category slug, or the tag's name. */
  key: string;
  /** The market's country code, or null for every market. */
  market: string | null;
  palette: PillTone;
  /** The username of the admin who chose it, or null if the account is gone. */
  setBy: string | null;
  updatedAt: string;
}

/** Why a change failed, for the page's message. */
export type BackgroundFailure = 'not_allowed' | 'no_list' | 'no_market' | 'unreachable';

/** A failed change, with the word the page shows. */
export class BackgroundSaveError extends Error {
  readonly failure: BackgroundFailure;

  constructor(failure: BackgroundFailure, message: string) {
    super(message);
    this.failure = failure;
  }
}

/**
 * Turns a database error into a failure the page can word.
 *
 * @param error - the error Supabase answered
 * @returns the matching BackgroundSaveError
 */
function backgroundErrorFrom(error: { code?: string; message: string; hint?: string }) {
  if (error.code === '42501') return new BackgroundSaveError('not_allowed', error.message);
  if (error.hint === 'no_list' || error.hint === 'no_market') {
    return new BackgroundSaveError(error.hint, error.message);
  }
  return new BackgroundSaveError('unreachable', error.message);
}

/**
 * Reads one row of the staff list into its typed shape, or null for a row it can't read.
 *
 * @param row - one element of admin_list_page_backgrounds()
 * @returns the choice, or null
 */
function backgroundFrom(row: unknown): ListBackground | null {
  if (typeof row !== 'object' || row === null) return null;
  const value = row as Record<string, unknown>;
  const palette = bandPalettes.find((tone) => tone === value.palette);
  if (palette === undefined || (value.kind !== 'category' && value.kind !== 'tag')) return null;
  return {
    kind: value.kind,
    key: String(value.key ?? ''),
    market: typeof value.market === 'string' ? value.market : null,
    palette,
    setBy: typeof value.set_by === 'string' ? value.set_by : null,
    updatedAt: String(value.updated_at ?? ''),
  };
}

/**
 * Reads every saved choice.
 *
 * @param client - the signed-in Supabase client
 * @returns the choices, genres first, then tags by name
 * @throws BackgroundSaveError when the read is refused or fails
 */
export async function fetchListBackgrounds(client: AppSupabaseClient): Promise<ListBackground[]> {
  const { data, error } = await client.rpc('admin_list_page_backgrounds');
  if (error !== null) throw backgroundErrorFrom(error);
  const rows = Array.isArray(data) ? data : [];
  return rows.map(backgroundFrom).filter((row): row is ListBackground => row !== null);
}

/** Which page and market a change is for. */
export interface BackgroundPlace {
  kind: 'category' | 'tag';
  key: string;
  market: string | null;
}

/**
 * Chooses a page's band colour.
 *
 * @param client - the signed-in Supabase client
 * @param place - the page and market
 * @param palette - one of the six colours
 * @throws BackgroundSaveError when refused
 */
export async function saveListBackground(
  client: AppSupabaseClient,
  place: BackgroundPlace,
  palette: PillTone,
): Promise<void> {
  const { error } = await client.rpc('admin_set_list_page_background', {
    list_kind: place.kind,
    list_key: place.key,
    // The generated type says text; null means every market, as the function's comment says.
    market: place.market as string,
    new_palette: palette,
  });
  if (error !== null) throw backgroundErrorFrom(error);
}

/**
 * Takes a page back to its default band in one market (or everywhere).
 *
 * @param client - the signed-in Supabase client
 * @param place - the page and market
 * @throws BackgroundSaveError when refused
 */
export async function clearListBackground(
  client: AppSupabaseClient,
  place: BackgroundPlace,
): Promise<void> {
  const { error } = await client.rpc('admin_clear_list_page_background', {
    list_kind: place.kind,
    list_key: place.key,
    market: place.market as string,
  });
  if (error !== null) throw backgroundErrorFrom(error);
}
