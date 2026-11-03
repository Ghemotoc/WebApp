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
 *    a signature picture that moves is held for a moderator even when the services pass it
 *    (S1-E8-08: one still picture; the app refuses one before upload, this catches the rest);
 * 5. signs the verdict with PICTURE_CHECK_SECRET and saves it through record_picture_check(),
 *    which refuses anything not signed with the same secret (Vault: picture_check_secret). The
 *    verdict carries the file's SHA-256 hash and the uploader's IP address scrambled with this
 *    month's key (server/scrambled-ip.ts; IP_SCRAMBLE_SECRET): the evidence about a suspected
 *    child sexual abuse image keeps both (bundle ADMIN-2, part e2b; Robert's brief of 2 Nov 2026,
 *    section 4). The database keeps the scrambled IP only when the uploader sent the request;
 * 6. when Arachnid Shield matched the picture, deletes the file straight away with the same token
 *    (the image is never kept; the nightly storage sweep deletes it if this call fails).
 * Nothing about the picture or the person is logged (CLAUDE.md rule 12).
 * Who calls it: functions/api/picture-check.ts on Cloudflare, server/pages-functions-plugin.ts
 * locally; the upload screens call POST /api/picture-check straight after an upload.
 */
import { pictureCheckRequestSchema } from '../src/schemas/pictureCheck';

import { isAnimatedPicture } from '../src/lib/animated-picture';

import type { CheckPicture, PictureVerdict } from './picture-check/index';
import { scrambleIp, visitorIp, type ScrambledIp } from './scrambled-ip';
import { hmacHex } from './signup-context';

/** What the handler needs from its surroundings. */
export interface PictureCheckOptions {
  supabaseUrl: string;
  anonKey: string;
  /** PICTURE_CHECK_SECRET; without it nothing can be saved (503). */
  secret: string | undefined;
  /** IP_SCRAMBLE_SECRET; without it no IP address is kept at all. */
  ipSecret?: string;
  checkPicture: CheckPicture;
}

/** What is signed and saved: the services' verdict plus the file's hash and the scrambled IP. */
interface SignedVerdict extends PictureVerdict {
  fileSha256: string;
  uploaderIp: ScrambledIp | null;
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
 * The file's SHA-256 hash, as hex: the fingerprint the police can match (brief section 4).
 *
 * @param bytes - the stored file
 * @returns 64 hex characters
 */
export async function sha256Hex(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Deletes a matched picture's file at once, as the caller (the uploader may delete a file whose
 * evidence is kept). A failure is left to the storage sweep, which lists the file straight away.
 *
 * @returns true when Storage deleted it
 */
async function deletePicture(
  options: PictureCheckOptions,
  token: string,
  picture: PictureRow,
): Promise<boolean> {
  const address = `${options.supabaseUrl}/storage/v1/object/${picture.bucket}/${picture.path}`;
  const response = await fetch(address, {
    method: 'DELETE',
    headers: headersFor(options, token),
  }).catch(() => null);
  return response !== null && response.ok;
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
  verdict: SignedVerdict,
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
 * Holds a moving signature picture for a person to look at (S1-E8-08 criterion 1). The app redraws
 * every picture as a still before uploading it, so a moving file here came some other way.
 *
 * @param verdict - the services' verdict
 * @param picture - the bucket the file is in
 * @param bytes - the stored file
 * @returns the verdict, flagged with "animated" when a signature picture moves
 */
export function withStillPictureRule(
  verdict: PictureVerdict,
  picture: { bucket: string },
  bytes: Uint8Array,
): PictureVerdict {
  if (picture.bucket !== 'signature-pictures' || !isAnimatedPicture(bytes)) return verdict;
  // An unavailable answer stays unavailable: the picture is tried again and held then.
  if (verdict.outcome === 'unavailable') return verdict;
  return { ...verdict, outcome: 'flagged', flags: { ...verdict.flags, animated: true } };
}

/**
 * Steps 3 to 6 for a pending picture: the file, the check, the signed save and, for a match,
 * deleting the file.
 *
 * @returns the picture's status, or null when the file or the database can't be reached
 */
async function checkAndSave(
  request: Request,
  options: PictureCheckOptions & { secret: string },
  token: string,
  picture: PictureRow & { id: string; originalName: string },
): Promise<string | null> {
  // Step 3: the file, as the caller.
  const file = await downloadPicture(options, token, picture);
  if (file === null) return null;
  // Step 4: the services, then the rule for moving signature pictures.
  const servicesVerdict = await options.checkPicture({
    ...file,
    originalName: picture.originalName,
  });
  const verdict = withStillPictureRule(servicesVerdict, picture, file.bytes);
  // Step 5: the hash and the scrambled IP join the verdict, which is signed and saved.
  const status = await saveVerdict(options, token, picture.id, {
    ...verdict,
    fileSha256: await sha256Hex(file.bytes),
    uploaderIp: await scrambleIp(visitorIp(request), options.ipSecret, new Date()),
  });
  // Step 6: a known abuse image is never kept.
  if (status !== null && verdict.isKnownAbuseMatch) await deletePicture(options, token, picture);
  return status;
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
  // Steps 3 to 6: the file, the check, the signed save and a match's file deleted.
  const status = await checkAndSave(request, { ...options, secret: options.secret }, token, {
    ...picture,
    id: parsed.data.pictureId,
    originalName: parsed.data.originalName,
  });
  if (status === null) return json({ error: 'unavailable' }, 503);
  return json({ status }, 200);
}
