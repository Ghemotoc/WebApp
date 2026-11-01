/**
 * The Storage sweep: deletes the files in Storage that no row points at any more (story S1-E13-04;
 * GDPR art. 5(1)(e)).
 *
 * Why it exists: deleting a row (a picture, an export, a deleted account's content) leaves its
 * file in Storage, and SQL can't delete the file itself. Only the Storage API can, and only with
 * the service role key, which lives in Edge Functions alone (CLAUDE.md rule 2).
 *
 * What it does, in order:
 * 1. refuses any call without the sweep key (STORAGE_SWEEP_KEY here, storage_sweep_key in the Vault);
 * 2. asks the database which files are due (storage_files_to_sweep(), a list of bucket and name);
 * 3. deletes them through the Storage API, bucket by bucket, 100 names at a time;
 * 4. answers how many went and how many failed (a failed one is listed again next night).
 * Never logged: file names (they hold user IDs) or keys (CLAUDE.md rule 12).
 * Who calls it: index.ts in this folder, which the database calls nightly through pg_net
 * (run_storage_sweep(), job run-storage-sweep). Tested by sweep.test.ts.
 */

/** One file the database says is due, as storage_files_to_sweep() answers it. */
export interface FileToSweep {
  bucket_id: string;
  name: string;
}

/** What the sweep needs: the project's address, its service role key and the sweep key. */
export interface SweepOptions {
  supabaseUrl: string;
  serviceRoleKey: string;
  sweepKey: string | undefined;
  /** The fetch to use; the tests pass a fake one. */
  fetchFunction?: typeof fetch;
}

/** How many files went and how many could not be deleted this time. */
export interface SweepResult {
  deleted: number;
  failed: number;
}

/** The most files asked for in one run; the rest wait for the next night. */
const filesPerRun = 500;

/** The most names in one Storage delete call. */
const namesPerCall = 100;

/**
 * The headers every call to the project carries: the service role key, as both the API key and
 * the bearer token.
 *
 * @param options - the sweep's options
 * @returns the headers
 */
function serviceHeaders(options: SweepOptions): Record<string, string> {
  return {
    apikey: options.serviceRoleKey,
    Authorization: `Bearer ${options.serviceRoleKey}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Asks the database which files are due.
 *
 * @param options - the sweep's options
 * @returns the files, oldest first
 * @throws Error when the database doesn't answer with a list
 */
export async function listFilesToSweep(options: SweepOptions): Promise<FileToSweep[]> {
  const fetchFunction = options.fetchFunction ?? fetch;
  const response = await fetchFunction(`${options.supabaseUrl}/rest/v1/rpc/storage_files_to_sweep`, {
    method: 'POST',
    headers: serviceHeaders(options),
    body: JSON.stringify({ max_files: filesPerRun }),
  });
  if (!response.ok) throw new Error(`storage_files_to_sweep answered ${response.status}`);
  const files: unknown = await response.json();
  if (!Array.isArray(files)) throw new Error('storage_files_to_sweep did not answer a list');
  return files as FileToSweep[];
}

/**
 * Groups the files by bucket and cuts each bucket's names into calls of at most 100.
 *
 * @param files - the files to delete
 * @returns one { bucket, names } per Storage call
 */
export function planDeleteCalls(files: FileToSweep[]): { bucket: string; names: string[] }[] {
  // Step 1: the names of each bucket.
  const namesByBucket = new Map<string, string[]>();
  for (const file of files) {
    const names = namesByBucket.get(file.bucket_id) ?? [];
    names.push(file.name);
    namesByBucket.set(file.bucket_id, names);
  }
  // Step 2: each bucket's names in slices of 100.
  const calls: { bucket: string; names: string[] }[] = [];
  for (const [bucket, names] of namesByBucket) {
    for (let start = 0; start < names.length; start += namesPerCall) {
      calls.push({ bucket, names: names.slice(start, start + namesPerCall) });
    }
  }
  return calls;
}

/**
 * Deletes the files through the Storage API. A call that fails counts its names as failed and
 * the sweep carries on with the next one.
 *
 * @param options - the sweep's options
 * @param files - the files to delete
 * @returns how many went and how many failed
 */
export async function deleteFiles(options: SweepOptions, files: FileToSweep[]): Promise<SweepResult> {
  const fetchFunction = options.fetchFunction ?? fetch;
  const result: SweepResult = { deleted: 0, failed: 0 };
  for (const call of planDeleteCalls(files)) {
    const response = await fetchFunction(
      `${options.supabaseUrl}/storage/v1/object/${encodeURIComponent(call.bucket)}`,
      { method: 'DELETE', headers: serviceHeaders(options), body: JSON.stringify({ prefixes: call.names }) },
    ).catch(() => null);
    if (response?.ok) result.deleted += call.names.length;
    else result.failed += call.names.length;
  }
  return result;
}

/**
 * Answers one call from the database.
 *
 * @param request - the call from run_storage_sweep(), with "Authorization: Bearer <sweep key>"
 * @param options - the sweep's options
 * @returns { deleted, failed } as JSON; 405 for anything but POST, 503 while a key is not set,
 *   401 for a wrong key, 502 when the database couldn't list the files
 */
export async function handleStorageSweep(request: Request, options: SweepOptions): Promise<Response> {
  // Step 1: only a POST with the right key.
  if (request.method !== 'POST') return Response.json({ error: 'post_only' }, { status: 405 });
  const sweepKey = options.sweepKey ?? '';
  if (sweepKey === '' || options.serviceRoleKey === '' || options.supabaseUrl === '') {
    return Response.json({ error: 'not_set_up' }, { status: 503 });
  }
  const given = (request.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (given !== sweepKey) return Response.json({ error: 'not_allowed' }, { status: 401 });
  // Step 2: which files are due.
  let files: FileToSweep[];
  try {
    files = await listFilesToSweep(options);
  } catch (error) {
    // Only the status goes to the log: never a file name or a key.
    console.error('storage-sweep: could not list the files', error instanceof Error ? error.message : 'unknown');
    return Response.json({ error: 'list_failed' }, { status: 502 });
  }
  // Step 3: delete them and say how it went.
  return Response.json(await deleteFiles(options, files));
}
