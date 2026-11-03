/**
 * Moderation › Pictures to check: the waiting pictures and the three decisions (bundle ADMIN-2,
 * part e1b; Robert's brief of 2 Nov 2026, sections 2 and 3).
 *
 * Who calls it: hooks/usePicturesToCheck.ts (PicturesToCheckPage).
 * What it calls next: admin_pictures_to_check(), admin_picture_reject_reasons(),
 * admin_approve_picture() and admin_reject_picture()
 * (…_admin2_e1b_pictures_to_check.sql). Each checks the caller may act on moderation; the
 * decisions write the audit log and the statement of reasons in the same transaction. Each picture
 * is read through a signed address made with the moderator's own sign-in, which Storage allows
 * for moderation staff only.
 */
import type { Enums, Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

import { failureFromCode, ModerationError, type AgeBand } from './moderationQueue';

/** A story's rating. */
export type StoryRating = Enums<'story_rating'>;

/** One picture waiting for a moderator, as the page shows it. */
export interface PictureToCheck {
  caseId: string;
  pictureId: string;
  kind: string;
  uploaderHandle: string;
  /** The age group only, never the year of birth (architecture 1.8.3). */
  uploaderAgeBand: AgeBand;
  /** The uploader's language, for the message they get when the picture is rejected. */
  uploaderLocale: string;
  story: { id: string; title: string; slug: string; rating: StoryRating } | null;
  /** The story owner's age group, which limits how far the rating can go up. */
  ownerAgeBand: AgeBand | null;
  waitingSince: string;
  /** A signed address that lasts ten minutes; null when Storage refused. */
  url: string | null;
}

/** A JSON object's fields, or an empty object for anything else. */
function fieldsOf(value: Json | undefined): Record<string, Json | undefined> {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value))
    return {};
  return value;
}

/** Reads a text field, or the fallback. */
function textOf(record: Record<string, Json | undefined>, key: string, fallback = ''): string {
  const value = record[key];
  return typeof value === 'string' ? value : fallback;
}

/** Reads the story part of a row, or null for a picture outside a story. */
function storyOf(value: Json | undefined): PictureToCheck['story'] {
  const story = fieldsOf(value);
  if (textOf(story, 'id') === '') return null;
  return {
    id: textOf(story, 'id'),
    title: textOf(story, 'title'),
    slug: textOf(story, 'slug'),
    rating: textOf(story, 'rating', 'all_ages') as StoryRating,
  };
}

/**
 * Reads one row of admin_pictures_to_check() and makes its signed address.
 *
 * @param client - the shared Supabase client
 * @param row - one JSON object
 * @returns the picture as the page shows it
 */
async function pictureFrom(client: AppSupabaseClient, row: Json): Promise<PictureToCheck> {
  const fields = fieldsOf(row);
  // Ten minutes: long enough to look, short enough that a copied address soon stops working.
  const signed = await client.storage
    .from(textOf(fields, 'bucket'))
    .createSignedUrl(textOf(fields, 'path'), 600);
  const ownerAgeBand = textOf(fields, 'ownerAgeBand');
  return {
    caseId: textOf(fields, 'caseId'),
    pictureId: textOf(fields, 'pictureId'),
    kind: textOf(fields, 'kind', 'cover'),
    uploaderHandle: textOf(fields, 'uploaderHandle'),
    uploaderAgeBand: textOf(fields, 'uploaderAgeBand', 'unknown') as AgeBand,
    uploaderLocale: textOf(fields, 'uploaderLocale', 'ro'),
    story: storyOf(fields.story),
    ownerAgeBand: ownerAgeBand === '' ? null : (ownerAgeBand as AgeBand),
    waitingSince: textOf(fields, 'waitingSince'),
    url: signed.error === null ? signed.data.signedUrl : null,
  };
}

/**
 * The pictures waiting for a moderator, oldest first.
 *
 * @param client - the shared Supabase client
 * @returns the pictures
 * Errors: throws ModerationError('not_allowed') for anyone outside the moderation team.
 */
export async function fetchPicturesToCheck(client: AppSupabaseClient): Promise<PictureToCheck[]> {
  const { data, error } = await client.rpc('admin_pictures_to_check');
  if (error !== null) throw new ModerationError(failureFromCode(error.code));
  return Promise.all((data ?? []).map((row) => pictureFrom(client, row)));
}

/**
 * The reasons a moderator can give for rejecting a picture (an admin-editable setting).
 *
 * @param client - the shared Supabase client
 * @returns the reason keys, in the order staff set
 * Errors: throws ModerationError as above.
 */
export async function fetchRejectReasons(client: AppSupabaseClient): Promise<string[]> {
  const { data, error } = await client.rpc('admin_picture_reject_reasons');
  if (error !== null) throw new ModerationError(failureFromCode(error.code));
  return Array.isArray(data) ? data.filter((reason) => typeof reason === 'string') : [];
}

/** What a moderator decided about one picture. */
export type PictureDecision =
  | { kind: 'approve'; caseId: string; note: string; newRating: StoryRating | null }
  | { kind: 'reject'; caseId: string; reason: string; message: string; note: string };

/**
 * Sends a decision: approve (green, or yellow with a new rating) or reject (red).
 *
 * @param client - the shared Supabase client
 * @param decision - the decision
 * Errors: throws ModerationError: 'refused' for a blank note or message, an unknown reason, a
 *   rating the rules don't allow or a picture someone already decided; 'not_allowed' as above.
 */
export async function decidePicture(
  client: AppSupabaseClient,
  decision: PictureDecision,
): Promise<void> {
  const { error } =
    decision.kind === 'approve'
      ? await client.rpc('admin_approve_picture', {
          target_case_id: decision.caseId,
          note_text: decision.note,
          ...(decision.newRating === null ? {} : { new_rating: decision.newRating }),
        })
      : await client.rpc('admin_reject_picture', {
          target_case_id: decision.caseId,
          reason_key: decision.reason,
          message_to_person: decision.message,
          note_text: decision.note,
        });
  if (error !== null) throw new ModerationError(failureFromCode(error.code));
}
