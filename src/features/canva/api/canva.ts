/**
 * "Design it in Canva": the calls the Canva pages make (story S1-E3-12; ADR 0009).
 *
 * Who calls it: the hooks in ../hooks (the start page, the return page and Settings).
 * What it calls next: our server's /api/canva/… addresses (server/canva.ts) with the writer's
 * sign-in token; the canva_connections table (Settings shows whether Canva is connected, through
 * canva_connections_select_own); then, for the returned design, the normal cover upload
 * (uploadPicture, which removes location data and asks for the picture check) and
 * update_my_story() to make it the story's cover.
 */
import { uploadPicture } from '@/features/pictures/api/pictures';
import type { AppSupabaseClient } from '@/lib/supabase';
import {
  CANVA_STORY_HEADER,
  canvaDesignResponseSchema,
  canvaFailureSchema,
  type CanvaFailure,
} from '@/schemas/canva';

import { startCanvaTrip } from '../lib/canvaTrip';

/** Why a Canva step didn't work. */
export class CanvaError extends Error {
  readonly failure: CanvaFailure;

  /** @param failure - one of the reasons in src/schemas/canva.ts */
  constructor(failure: CanvaFailure) {
    super(`The Canva step didn't work: ${failure}`);
    this.name = 'CanvaError';
    this.failure = failure;
  }
}

/**
 * Sends one request to /api/canva/… as the writer.
 *
 * @param route - for example "design"
 * @param body - the JSON to send
 * @returns the response, when it was a success
 * @throws CanvaError with the server's reason, signed_out or unreachable
 */
async function postToCanva(client: AppSupabaseClient, route: string, body: unknown) {
  const { data } = await client.auth.getSession();
  const token = data.session?.access_token;
  if (token === undefined) throw new CanvaError('signed_out');
  const response = await fetch(`/api/canva/${route}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  }).catch(() => null);
  if (response === null) throw new CanvaError('unreachable');
  if (response.ok) return response;
  const refusal = canvaFailureSchema.safeParse(await response.json().catch(() => null));
  throw new CanvaError(refusal.success ? refusal.data.error : 'unreachable');
}

/**
 * Asks for a new blank cover design (criterion 1), or for Canva's consent page first when the
 * writer hasn't connected (criterion 4).
 *
 * @param story - the story's ID and title
 * @returns the address to send the tab to
 * @throws CanvaError
 */
export async function openCanvaDesign(
  client: AppSupabaseClient,
  story: { storyId: string; storyTitle: string },
): Promise<string> {
  const { trip, codeChallenge } = await startCanvaTrip(story);
  const response = await postToCanva(client, 'design', {
    storyId: story.storyId,
    storyTitle: story.storyTitle,
    codeChallenge,
    state: trip.state,
  });
  const answer = canvaDesignResponseSchema.safeParse(await response.json().catch(() => null));
  if (!answer.success) throw new CanvaError('unreachable');
  return answer.data.kind === 'design' ? answer.data.editUrl : answer.data.authorizeUrl;
}

/**
 * Connects the writer's Canva account with the code from Canva's consent page.
 *
 * @param proof - the code and this tab's PKCE verifier
 * @throws CanvaError
 */
export async function connectCanva(
  client: AppSupabaseClient,
  proof: { code: string; codeVerifier: string },
): Promise<void> {
  await postToCanva(client, 'connect', proof);
}

/**
 * Brings the design back after Return in Canva: our server checks Canva's token and exports the
 * design as a PNG (criterion 2).
 *
 * @param correlationJwt - the token from the address
 * @returns the PNG as a file and the story it is for
 * @throws CanvaError
 */
export async function bringBackCanvaDesign(
  client: AppSupabaseClient,
  correlationJwt: string,
): Promise<{ file: File; storyId: string }> {
  const response = await postToCanva(client, 'return', { correlationJwt });
  const storyId = response.headers.get(CANVA_STORY_HEADER);
  if (storyId === null) throw new CanvaError('unreachable');
  const blob = await response.blob();
  return { file: new File([blob], 'canva-cover.png', { type: 'image/png' }), storyId };
}

/**
 * Uploads the returned design as the story's cover and saves it (criterion 3): it goes through
 * the same picture rules as any cover, so readers see it only after the picture check.
 *
 * @param story - the story's ID (its covers folder) and slug
 * @param file - the PNG from bringBackCanvaDesign()
 * @returns the picture check's status, for example "passed" or "pending"
 * @throws PictureUploadError from the upload; Error when the story couldn't be saved
 */
export async function saveCanvaCover(
  client: AppSupabaseClient,
  story: { storyId: string; slug: string },
  file: File,
): Promise<string> {
  const uploaded = await uploadPicture(client, {
    bucket: 'covers',
    folder: story.storyId,
    kind: 'cover',
    file,
  });
  const { data, error } = await client.rpc('update_my_story', {
    story_slug: story.slug,
    changes: { cover: { kind: 'upload', tall_path: uploaded.path } },
  });
  const outcome = (data as { outcome?: string } | null)?.outcome;
  if (error !== null || outcome !== 'ok') throw new Error('Could not save the Canva cover.');
  return uploaded.status;
}

/**
 * Whether the writer has connected Canva, for Settings.
 *
 * @returns when they connected, or null when they haven't
 * @throws Error when the database can't be reached
 */
export async function fetchCanvaConnection(client: AppSupabaseClient): Promise<string | null> {
  const { data, error } = await client.from('canva_connections').select('created_at').maybeSingle();
  if (error !== null) throw new Error(`Could not read the Canva connection: ${error.message}`);
  return data?.created_at ?? null;
}

/**
 * Disconnects Canva: our server asks Canva to forget the tokens, then removes the connection.
 *
 * @throws CanvaError
 */
export async function disconnectCanva(client: AppSupabaseClient): Promise<void> {
  await postToCanva(client, 'disconnect', {});
}
