/**
 * The picture a shared picture link shows in chat previews (bundle IDEAS-2, part f; idea
 * IDEA-20261101-12).
 *
 * GET /api/picture-preview/<story>/<chapter>/<block> answers the picture file for a link to a
 * picture in a chapter (/s/<story>/<chapter>/p<block>), which server/link-preview.ts names as the
 * preview's og:image. On every fetch it asks get_shared_picture() again, as a visitor, so it
 * only ever sends a picture that may be shared: a story under 16+, the writer's "Sharing
 * pictures" switch on and the picture's check passed (CLAUDE.md rule 19). Then it reads the
 * file from the private chapter-images bucket as a visitor too, through the policy that lets
 * anyone read a visible picture; no service key (rule 2). Anything else is a plain 404, and the
 * chat app falls back to the page's other details.
 * Chat apps keep previews for a while, so the answer may be cached for an hour at most: a picture
 * removed by a moderator stops being sent within the hour.
 * Who calls it: functions/api/picture-preview/[[path]].ts on Cloudflare and
 * server/pages-functions-plugin.ts locally. What it calls: the Supabase REST endpoint
 * /rest/v1/rpc/get_shared_picture and the Storage endpoint, with the public anon key.
 * Never logged: the request, the visitor or the picture (rule 12).
 */
import type { DatabaseSettings } from './link-preview.ts';

/** Story slugs, chapter codes and block numbers as the app makes them. */
const addressPattern =
  /^\/api\/picture-preview\/([a-z0-9]+(?:-[a-z0-9]+)*)\/([a-z0-9]{8})\/([1-9][0-9]{0,4})$/;

/** The picture types the bucket takes (S1-E3-09). */
const pictureTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

/** What get_shared_picture() answers. */
interface SharedPicture {
  bucket: string;
  path: string;
  alt: string;
}

/** One picture address's parts. */
export interface PicturePreviewAddress {
  storySlug: string;
  chapterCode: string;
  blockNumber: number;
}

/**
 * Reads an address under /api/picture-preview/.
 *
 * @param pathname - the request's path
 * @returns its parts, or null when it isn't a picture preview address
 */
export function parsePicturePreviewAddress(pathname: string): PicturePreviewAddress | null {
  const match = addressPattern.exec(pathname);
  if (match === null) return null;
  return { storySlug: match[1] ?? '', chapterCode: match[2] ?? '', blockNumber: Number(match[3]) };
}

/**
 * The address of a picture link's preview picture.
 *
 * @param origin - our own address
 * @returns /api/picture-preview/<story>/<chapter>/<block> on that origin
 */
export function picturePreviewUrl(origin: string, address: PicturePreviewAddress): string {
  return `${origin}/api/picture-preview/${address.storySlug}/${address.chapterCode}/${address.blockNumber}`;
}

/**
 * Asks the database which picture a link may show.
 *
 * @returns the picture's bucket, path and alt text, or null when none may be shown
 * Errors: throws when the database answers with an error or can't be reached.
 */
export async function fetchSharedPicture(
  settings: DatabaseSettings,
  address: PicturePreviewAddress,
): Promise<SharedPicture | null> {
  const response = await fetch(`${settings.supabaseUrl}/rest/v1/rpc/get_shared_picture`, {
    method: 'POST',
    headers: {
      apikey: settings.anonKey,
      Authorization: `Bearer ${settings.anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      story_slug: address.storySlug,
      chapter_code: address.chapterCode,
      block_number: address.blockNumber,
    }),
  });
  if (!response.ok) throw new Error(`get_shared_picture answered ${response.status}`);
  const row = (await response.json()) as Partial<SharedPicture> | null;
  if (typeof row?.bucket !== 'string' || typeof row.path !== 'string') return null;
  return { bucket: row.bucket, path: row.path, alt: row.alt ?? '' };
}

/** A plain "no picture here" that nobody keeps. */
function notFound(): Response {
  return new Response('Not found', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

/**
 * Reads the picture's file as a visitor.
 *
 * @returns the file's response, or null when Storage refused or isn't a picture
 */
async function readPictureFile(
  settings: DatabaseSettings,
  picture: SharedPicture,
): Promise<Response | null> {
  const objectPath = picture.path.split('/').map(encodeURIComponent).join('/');
  const file = await fetch(
    `${settings.supabaseUrl}/storage/v1/object/authenticated/${encodeURIComponent(picture.bucket)}/${objectPath}`,
    { headers: { apikey: settings.anonKey, Authorization: `Bearer ${settings.anonKey}` } },
  ).catch(() => null);
  const type = file?.headers.get('Content-Type')?.split(';')[0]?.trim() ?? '';
  if (file === null || !file.ok || !pictureTypes.has(type)) return null;
  return file;
}

/**
 * Answers GET /api/picture-preview/<story>/<chapter>/<block>.
 *
 * @param request - the incoming request
 * @param settings - the Supabase address and public anon key
 * @returns the picture, or 404 when there is none that may be shown
 */
export async function handlePicturePreview(
  request: Request,
  settings: DatabaseSettings,
): Promise<Response> {
  // Step 1: only GET, and only an address we make.
  const address = parsePicturePreviewAddress(new URL(request.url).pathname);
  if (request.method !== 'GET' || address === null) return notFound();
  // Step 2: the database says whether the picture may be shown, every time.
  const picture = await fetchSharedPicture(settings, address).catch(() => null);
  if (picture === null) return notFound();
  // Step 3: the file itself, read as a visitor, sent on with a short cache.
  const file = await readPictureFile(settings, picture);
  if (file === null) return notFound();
  return new Response(file.body, {
    status: 200,
    headers: {
      'Content-Type': file.headers.get('Content-Type') ?? 'image/png',
      'Cache-Control': 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex',
    },
  });
}
