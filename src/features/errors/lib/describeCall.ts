/**
 * describeCall: says what kind of back-end call an address is, and its name, for the call log
 * (bundle LOGS-1, part c; Robert, 6 Nov 2026: "every call that's been made, where it failed").
 *
 * Who calls it: lib/callRecorder.ts, for every fetch the browser makes.
 * What it keeps: only the kind (rpc, table, auth, function, storage, api) and a name such as an
 * RPC's or table's name, an Auth step or an /api path. Never the query string (filters can carry
 * someone's handle or words), never a body, and IDs in a path become ":id" (CLAUDE.md rule 12).
 * Addresses that aren't ours (fonts, pictures, the CMS's files) and the call log's own call give
 * null, so they are not logged.
 */

/** The kinds the call log knows (public.call_log, call_log_kind_is_known). */
export type CallKind = 'rpc' | 'table' | 'auth' | 'function' | 'storage' | 'api';

/** What a call is. */
export interface CallDescription {
  kind: CallKind;
  name: string;
}

/** The RPC that stores the log; logging it would log forever. */
const ownRpcName = 'log_calls';

/** The longest name the table accepts (call_log_name_shape). */
const maximumNameLength = 100;

/** Path parts that are words the API uses for a Storage action, not a bucket's name. */
const storageActions = new Set(['public', 'sign', 'authenticated', 'info', 'upload', 'render']);

/**
 * Replaces a path part that identifies a row or carries a code.
 *
 * @param part - one part of a path, between slashes
 * @returns ":id" for a UUID, a number of 4 or more digits or a token-like string of 20 or more
 *   characters; the part itself otherwise
 */
function scrubPathPart(part: string): string {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(part)) return ':id';
  if (/^[0-9]{4,}$/.test(part)) return ':id';
  if (/^[A-Za-z0-9_-]{20,}$/.test(part)) return ':id';
  return part;
}

/**
 * Makes a name fit the table: only letters, digits and _ . : / -, at most 100 characters.
 *
 * @param raw - the name as found in the address
 * @returns the cleaned name, "unknown" when nothing is left
 */
function cleanName(raw: string): string {
  const cleaned = raw.replace(/[^A-Za-z0-9_.:/-]/g, '_').slice(0, maximumNameLength);
  return cleaned === '' ? 'unknown' : cleaned;
}

/**
 * Names a call to the database API ("/rest/v1/rpc/name" or "/rest/v1/table").
 *
 * @param parts - the path's parts after the version
 * @returns an RPC or a table, or null for the call log's own call
 */
function describeRestCall(parts: string[]): CallDescription | null {
  const [first = '', second = ''] = parts;
  if (first !== 'rpc') return { kind: 'table', name: cleanName(first) };
  return second === ownRpcName ? null : { kind: 'rpc', name: cleanName(second) };
}

/**
 * Names a Storage call by its action and bucket, never the file's path (it can hold a user ID).
 *
 * @param parts - the path's parts after the version
 * @returns the description
 */
function describeStorageCall(parts: string[]): CallDescription {
  const [action = '', second = '', third = ''] = parts;
  const bucket = storageActions.has(second) ? third : second;
  return { kind: 'storage', name: cleanName(`${action}/${bucket}`) };
}

/**
 * Names a call to the Supabase API from the path after its version.
 *
 * @param service - rest, auth, functions or storage
 * @param parts - the path's parts after the version
 * @returns the description, or null for a call that isn't logged
 */
function describeSupabaseCall(service: string, parts: string[]): CallDescription | null {
  const first = parts[0] ?? '';
  if (service === 'rest') return describeRestCall(parts);
  if (service === 'auth') return { kind: 'auth', name: cleanName(first) };
  if (service === 'functions') return { kind: 'function', name: cleanName(first) };
  if (service === 'storage') return describeStorageCall(parts);
  return null;
}

/**
 * Says what a call is.
 *
 * @param address - the address the browser is fetching
 * @param supabaseUrl - the Supabase project's address (VITE_SUPABASE_URL), or "" without one
 * @param pageOrigin - the app's own origin, for its /api addresses
 * @returns the kind and name, or null when the call is not logged
 */
export function describeCall(
  address: string,
  supabaseUrl: string,
  pageOrigin: string,
): CallDescription | null {
  // Step 1: read the address; something that isn't one is not ours.
  let url: URL;
  try {
    url = new URL(address, pageOrigin);
  } catch {
    return null;
  }
  // Step 2: the Supabase API: "/<service>/v1/…".
  if (supabaseUrl !== '' && url.origin === new URL(supabaseUrl).origin) {
    const [service = '', version = '', ...rest] = url.pathname.split('/').filter(Boolean);
    if (version !== 'v1') return null;
    return describeSupabaseCall(service, rest);
  }
  // Step 3: our own server's addresses under /api, with IDs replaced.
  if (url.origin === pageOrigin && url.pathname.startsWith('/api/')) {
    const path = url.pathname.split('/').map(scrubPathPart).join('/');
    return { kind: 'api', name: cleanName(path) };
  }
  return null;
}
