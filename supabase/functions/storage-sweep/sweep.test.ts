/**
 * Unit tests for the Storage sweep (story S1-E13-04): the key check, listing the due files and
 * deleting them bucket by bucket. A fake fetch stands in for the database and the Storage API.
 */
import { describe, expect, it } from 'vitest';

import { handleStorageSweep, planDeleteCalls, type FileToSweep, type SweepOptions } from './sweep';

/** A call the fake fetch saw. */
interface SeenCall {
  url: string;
  method: string;
  body: unknown;
}

/**
 * Options with a fake fetch that lists the given files and answers each Storage delete.
 *
 * @param files - what storage_files_to_sweep() answers
 * @param deleteWorks - whether the Storage deletes succeed
 * @returns the options and the calls seen
 */
function fakeProject(files: FileToSweep[], deleteWorks = true) {
  const calls: SeenCall[] = [];
  const fetchFunction = (async (url: string, init: RequestInit) => {
    calls.push({ url, method: init.method ?? 'GET', body: JSON.parse(String(init.body)) });
    if (url.endsWith('/rpc/storage_files_to_sweep')) return Response.json(files);
    return deleteWorks ? Response.json([]) : new Response('no', { status: 500 });
  }) as typeof fetch;
  const options: SweepOptions = {
    supabaseUrl: 'https://project.example',
    serviceRoleKey: 'service-key',
    sweepKey: 'sweep-key',
    fetchFunction,
  };
  return { options, calls };
}

/** A POST from the database with the given key. */
function callWithKey(key: string) {
  return new Request('https://functions.example/storage-sweep', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
  });
}

describe('the Storage sweep', () => {
  it('refuses a call without the right sweep key', async () => {
    const { options, calls } = fakeProject([]);
    const response = await handleStorageSweep(callWithKey('wrong'), options);
    expect(response.status).toBe(401);
    expect(calls).toHaveLength(0);
  });

  it('does nothing while the sweep key is not set', async () => {
    const { options } = fakeProject([]);
    const response = await handleStorageSweep(callWithKey(''), { ...options, sweepKey: undefined });
    expect(response.status).toBe(503);
  });

  it('deletes the due files bucket by bucket and says how many went', async () => {
    const { options, calls } = fakeProject([
      { bucket_id: 'avatars', name: 'a/1.jpg' },
      { bucket_id: 'exports', name: 'x.zip' },
      { bucket_id: 'avatars', name: 'a/2.jpg' },
    ]);
    const response = await handleStorageSweep(callWithKey('sweep-key'), options);
    expect(await response.json()).toEqual({ deleted: 3, failed: 0 });
    const deletes = calls.filter((call) => call.method === 'DELETE');
    expect(deletes.map((call) => call.url)).toEqual([
      'https://project.example/storage/v1/object/avatars',
      'https://project.example/storage/v1/object/exports',
    ]);
    expect(deletes[0]?.body).toEqual({ prefixes: ['a/1.jpg', 'a/2.jpg'] });
  });

  it('counts a failed delete so the files are tried again next night', async () => {
    const { options } = fakeProject([{ bucket_id: 'covers', name: 'c.jpg' }], false);
    const response = await handleStorageSweep(callWithKey('sweep-key'), options);
    expect(await response.json()).toEqual({ deleted: 0, failed: 1 });
  });

  it('cuts a long list into Storage calls of at most 100 names', () => {
    const files = Array.from({ length: 250 }, (_, index) => ({ bucket_id: 'covers', name: `${index}.jpg` }));
    expect(planDeleteCalls(files).map((call) => call.names.length)).toEqual([100, 100, 50]);
  });
});
