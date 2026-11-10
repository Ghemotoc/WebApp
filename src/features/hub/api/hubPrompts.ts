/**
 * Writing prompts: the hub's prompt of the week, tying a new story to a prompt, and the staff
 * list (bundle GAPS-12c; board WritersHub, "Prompt of the week").
 *
 * Who calls it: hooks/useHubPrompts.ts (the hub card and the new-story screen) and
 * hooks/useStaffPrompts.ts (the staff page at /staff/hub).
 * What it calls next (migration gaps12c_writing_prompts):
 * - writers_hub_prompts(): the prompts that have started, newest first, each with how many
 *   writers started a story from it. Members can't read the table itself.
 * - start_story_from_prompt(): the writer's own new story remembers its prompt.
 * - the writing_prompts table (read by staff with the contests area through its RLS policy),
 *   admin_save_writing_prompt() and admin_delete_writing_prompt(), which check the same area and
 *   write the audit log.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

/** One started prompt as the hub shows it. */
export interface HubPrompt {
  promptId: string;
  promptRo: string;
  promptEn: string;
  /** The last of its 7 days (YYYY-MM-DD, Romania time, included). */
  endsOn: string;
  /** True while today is one of its 7 days: the prompt of the week. */
  isCurrent: boolean;
  /** How many writers have a story started from it. */
  writerCount: number;
}

/** One prompt on the staff page, upcoming ones included. */
export interface StaffPrompt {
  id: string;
  promptRo: string;
  promptEn: string;
  /** The first of its 7 days (YYYY-MM-DD, Romania time). */
  startsOn: string;
}

/** What staff fill in to add or change a prompt; id is null for a new one. */
export interface PromptDraft {
  id: string | null;
  promptRo: string;
  promptEn: string;
  startsOn: string;
}

/** The longest a prompt may be; the database checks the same limit. */
export const promptLimit = 300;

/** A prompt ID as it travels in an address (?prompt=…): a UUID. */
const promptIdShape = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Checks that a value from the address bar looks like a prompt ID before it goes anywhere.
 *
 * @param value - what ?prompt= holds, or null
 * @returns the ID, or null when it is missing or not a UUID
 */
export function promptIdFrom(value: string | null): string | null {
  if (value === null || !promptIdShape.test(value)) return null;
  return value;
}

/**
 * The prompts that have started, newest first (at most 8).
 *
 * @param client - the shared Supabase client
 * @returns the prompts; empty when staff haven't written one yet
 * @throws when the read fails
 */
export async function fetchHubPrompts(client: AppSupabaseClient): Promise<HubPrompt[]> {
  const { data, error } = await client.rpc('writers_hub_prompts');
  if (error !== null) throw new Error(`Could not read the writing prompts: ${error.message}`);
  return data.map((row) => ({
    promptId: row.prompt_id,
    promptRo: row.prompt_ro,
    promptEn: row.prompt_en,
    endsOn: row.ends_on,
    isCurrent: row.is_current,
    writerCount: row.writer_count,
  }));
}

/**
 * Ties the writer's own new story to the prompt it was started from.
 *
 * @param client - the shared Supabase client
 * @param storySlug - the story just made
 * @param promptId - the prompt picked on the hub
 * @returns true when the story now remembers the prompt; false when the database declined (the
 *   prompt left the hub, or the story already has one)
 * @throws when the call itself fails
 */
export async function startStoryFromPrompt(
  client: AppSupabaseClient,
  storySlug: string,
  promptId: string,
): Promise<boolean> {
  const { data, error } = await client.rpc('start_story_from_prompt', {
    story_slug: storySlug,
    prompt_id: promptId,
  });
  if (error !== null) throw new Error(`Could not tie the story to its prompt: ${error.message}`);
  return data;
}

/**
 * Every prompt that isn't deleted, newest start day first, for staff.
 *
 * @param client - the shared Supabase client
 * @returns the prompts; empty for anyone without the contests area (the policy shows them none)
 * @throws when the read fails
 */
export async function fetchStaffPrompts(client: AppSupabaseClient): Promise<StaffPrompt[]> {
  const { data, error } = await client
    .from('writing_prompts')
    .select('id, prompt_ro, prompt_en, starts_on')
    .order('starts_on', { ascending: false });
  if (error !== null) throw new Error(`Could not read the writing prompts: ${error.message}`);
  return data.map((row) => ({
    id: row.id,
    promptRo: row.prompt_ro,
    promptEn: row.prompt_en,
    startsOn: row.starts_on,
  }));
}

/** Why a staff change was refused, in the words the page has text for. */
export type PromptFailure = 'not_allowed' | 'day_taken' | 'refused' | 'failed';

/** A refused staff change, carrying which message to show. */
export class PromptError extends Error {
  readonly failure: PromptFailure;

  constructor(failure: PromptFailure, message: string) {
    super(message);
    this.failure = failure;
  }
}

/**
 * Turns the database's refusal into the message to show.
 *
 * @param error - what the call answered: its SQLSTATE and words
 * @returns the error to throw
 */
function promptErrorFrom(error: { code?: string; message: string }): PromptError {
  // 42501: not contest staff. 23505: another prompt starts that day. 23514: empty or too long.
  if (error.code === '42501') return new PromptError('not_allowed', error.message);
  if (error.code === '23505') return new PromptError('day_taken', error.message);
  if (error.code === '23514') return new PromptError('refused', error.message);
  return new PromptError('failed', error.message);
}

/**
 * Adds a prompt, or changes one; logged with the before and after words.
 *
 * @param client - the shared Supabase client
 * @param draft - the words in both languages and the start day
 * @returns the prompt's ID
 * @throws PromptError
 */
export async function savePrompt(client: AppSupabaseClient, draft: PromptDraft): Promise<string> {
  const { data, error } = await client.rpc('admin_save_writing_prompt', {
    // The generated types want a string; null is how a new prompt is asked for.
    prompt_id: draft.id as string,
    prompt_ro: draft.promptRo,
    prompt_en: draft.promptEn,
    starts_on: draft.startsOn,
  });
  if (error !== null) throw promptErrorFrom(error);
  return data;
}

/**
 * Takes a prompt off the hub and the staff list; the audit log keeps its words.
 *
 * @param client - the shared Supabase client
 * @param promptId - the prompt to delete
 * @throws PromptError
 */
export async function deletePrompt(client: AppSupabaseClient, promptId: string): Promise<void> {
  const { error } = await client.rpc('admin_delete_writing_prompt', { prompt_id: promptId });
  if (error !== null) throw promptErrorFrom(error);
}
