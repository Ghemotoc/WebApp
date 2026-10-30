/**
 * The picture check's server side: runs every uploaded picture past the checking services before
 * anyone else can see it (story S1-E10-05; CLAUDE.md rule 19).
 *
 * What it does, in order:
 * 1. checks the request against the shared schema (src/schemas/pictureCheck.ts) and takes the
 *    caller's own sign-in token: no service key is ever used (CLAUDE.md rule 2);
 * 2. reads the picture's row with that token: only the uploader or moderation staff can, so
 *    nobody can check someone else's picture; a picture that isn't pending is answered as it is;
 * 3. downloads the file from Storage with the same token (the uploader and staff may read it);
 * 4. runs the checks through the adapter (server/picture-check/: the stub or the real services);
 * 5. signs the verdict with PICTURE_CHECK_SECRET and saves it through record_picture_check(),
 *    which refuses anything not signed with the same secret (Vault: picture_check_secret).
 * Nothing about the picture or the person is logged (CLAUDE.md rule 12).
 * Who calls it: functions/api/picture-check.ts on Cloudflare, server/pages-functions-plugin.ts
 * locally; the upload screens call POST /api/picture-check straight after an upload.
 */
import { pictureCheckRequestSchema } from '../src/schemas/pictureCheck';

import type { CheckPicture, PictureVerdict } from './picture-check/index';
import { hmacHex } from './signup-context';

/** What the handler needs from its surroundings. */
export interface PictureCheckOptions {
  supabaseUrl: string;
  anonKey: string;
  /** PICTURE_CHECK_SECRET; without it nothing can be saved (503). */
  secret: string | undefined;
  checkPicture: CheckPicture;
}

/** The parts of the picture's row the handler reads. */
interface PictureRow {
  bucket: string;
  path: string;
  status: string;
}

/**
 * The headers for a call made as the signed-in person.
 *
 * @param options - the anon key
 * @param token - the person's sign-in token
 * @returns the headers
 */
function headersFor(options: PictureCheckOptions, token: string): Record<string, string> {
  return { apikey: options.anonKey, Authorization: `Bearer ${token}` };
}

/**
 * Reads the picture's row as the caller; the table's policies show it only to the uploader and
 * moderation staff.
 *
 * @returns the row, or null when the caller may not see it or it doesn't exist
 */
async function readPicture(
  options: PictureCheckOptions,
  token: string,
  pictureId: string,
): Promise<PictureRow | null> {
  const address = `${options.supabaseUrl}/rest/v1/picture_checks?id=eq.${pictureId}&select=bucket,path,status`;
  const response = await fetch(address, { headers: headersFor(options, token) }).catch(() => null);
  if (response === null || !response.ok) return null;
  const rows = (await response.json()) as PictureRow[];
  return rows[0] ?? null;
}

/**
 * Downloads the file as the caller.
 *
 * @returns the bytes and their type, or null when it can't be read
 */
async function downloadPicture(
  options: PictureCheckOptions,
  token: string,
  picture: PictureRow,
): Promise<{ bytes: Uint8Array<ArrayBuffer>; contentType: string } | null> {
  const address = `${options.supabaseUrl}/storage/v1/object/authenticated/${picture.bucket}/${picture.path}`;
  const response = await fetch(address, { headers: headersFor(options, token) }).catch(() => null);
  if (response === null || !response.ok) return null;
  const contentType = response.headers.get('Content-Type') ?? 'application/octet-stream';
  return { bytes: new Uint8Array(await response.arrayBuffer()), contentType };
}

/**
 * Saves the signed verdict through record_picture_check(), as the caller.
 *
 * @returns the picture's status afterwards, or null when the database refused or didn't answer
 */
async function saveVerdict(
  options: PictureCheckOptions & { secret: string },
  token: string,
  pictureId: string,
  verdict: PictureVerdict,
): Promise<string | null> {
  const payload = JSON.stringify({ pictureId, ...verdict });
  const response = await fetch(`${options.supabaseUrl}/rest/v1/rpc/record_picture_check`, {
    method: 'POST',
    headers: { ...headersFor(options, token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload, signature: await hmacHex(payload, options.secret) }),
  }).catch(() => null);
  if (response === null || !response.ok) return null;
  return (await response.json()) as string;
}

/**
 * The caller's sign-in token from the Authorization header.
 *
 * @param request - the request
 * @returns the token, or null when there is none
 */
export function bearerToken(request: Request): string | null {
  const header = request.headers.get('Authorization') ?? '';
  const match = /^Bearer (\S+)$/.exec(header);
  return match?.[1] ?? null;
}

/**
 * Answers POST /api/picture-check.
 *
 * @param request - the request with { pictureId, originalName } and the caller's token
 * @param options - the database, the secret and the checker
 * @returns 200 with { status }; 400 for a bad request; 401 without a token; 404 for a picture the
 *   caller can't see; 503 when the secret is missing or the file or database can't be reached
 * Errors: none thrown; nothing is logged.
 */
export async function handlePictureCheck(
  request: Request,
  options: PictureCheckOptions,
): Promise<Response> {
  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  // Step 1: the schema, the token and the secret.
  const parsed = pictureCheckRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: 'invalid' }, 400);
  const token = bearerToken(request);
  if (token === null) return json({ error: 'signed_out' }, 401);
  if (options.secret === undefined || options.secret === '')
    return json({ error: 'unavailable' }, 503);
  // Step 2: the row, as the caller; only a pending picture is checked.
  const picture = await readPicture(options, token, parsed.data.pictureId);
  if (picture === null) return json({ error: 'not_found' }, 404);
  if (picture.status !== 'pending') return json({ status: picture.status }, 200);
  // Step 3: the file, as the caller.
  const file = await downloadPicture(options, token, picture);
  if (file === null) return json({ error: 'unavailable' }, 503);
  // Step 4 and 5: the check, then the signed save.
  const verdict = await options.checkPicture({ ...file, originalName: parsed.data.originalName });
  const status = await saveVerdict(
    { ...options, secret: options.secret },
    token,
    parsed.data.pictureId,
    verdict,
  );
  if (status === null) return json({ error: 'unavailable' }, 503);
  return json({ status }, 200);
}
