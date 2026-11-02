/**
 * Tests for the front end of a data request's parent path (bundle ADMIN-2, part c3; S1-E11-09
 * criterion 5): reading the database's answers about a parent's link, and turning our server's
 * refusals into the staff page's failures. The database rules are in pgTAP test 244; the server's
 * in server/data-request-parent.test.ts.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AppSupabaseClient } from '@/lib/supabase';

import { fetchParentLink, openParentCopy, postParentLink } from './dataRequestParent';
import { DataRequestError } from './dataRequests';

/** A fake client whose functions answer the given data, signed in as staff. */
function fakeClient(data: unknown) {
  return {
    rpc: vi.fn(async () => ({ data, error: null })),
    auth: { getSession: async () => ({ data: { session: { access_token: 'staff-token' } } }) },
  } as unknown as AppSupabaseClient;
}

afterEach(() => vi.unstubAllGlobals());

describe('fetchParentLink', () => {
  it('reads a check link without any ID or address', async () => {
    const link = await fetchParentLink(
      fakeClient({
        outcome: 'ok',
        link: 'check',
        language: 'en',
        handle: 'lia',
        reference: 'D-000012',
        request_type: 'copy',
        received_on: '2026-11-02',
        identity: 'asked',
      }),
      'token',
    );
    expect(link).toEqual({
      link: 'check',
      language: 'en',
      handle: 'lia',
      reference: 'D-000012',
      requestType: 'copy',
      receivedOn: '2026-11-02',
      identity: 'asked',
    });
  });

  it('gives null for a link that no longer works', async () => {
    await expect(fetchParentLink(fakeClient({ outcome: 'gone' }), 'token')).resolves.toBeNull();
  });
});

describe('openParentCopy', () => {
  it('gives the files to download until the hour is over', async () => {
    const opened = await openParentCopy(
      fakeClient({
        outcome: 'ok',
        open_until: '2026-11-02T21:00:00Z',
        files: [{ file_name: 'r.zip', display_name: 'D-000012-copy.zip', file_size: 42 }],
      }),
      'token',
    );
    expect(opened).toEqual({
      outcome: 'ok',
      openUntil: '2026-11-02T21:00:00Z',
      files: [{ fileName: 'r.zip', displayName: 'D-000012-copy.zip', fileSize: 42 }],
    });
  });

  it('says when the link was already used', async () => {
    await expect(openParentCopy(fakeClient({ outcome: 'used' }), 'token')).resolves.toEqual({
      outcome: 'used',
    });
  });
});

describe('postParentLink', () => {
  it('posts the request with the staff member’s sign-in', async () => {
    const fetchSpy = vi.fn(async () => Response.json({ sent: true }));
    vi.stubGlobal('fetch', fetchSpy);
    await postParentLink(fakeClient(null), 'ask', 'request-1');
    expect(fetchSpy).toHaveBeenCalledWith('/api/data-request-parent/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer staff-token' },
      body: JSON.stringify({ requestId: 'request-1' }),
    });
  });

  it('passes on the database’s reason, and calls a failed email by its name', async () => {
    vi.stubGlobal('fetch', async () =>
      Response.json({ error: 'no_parent_on_record' }, { status: 409 }),
    );
    await expect(postParentLink(fakeClient(null), 'ask', 'request-1')).rejects.toEqual(
      new DataRequestError('no_parent_on_record'),
    );
    vi.stubGlobal('fetch', async () => Response.json({ error: 'unavailable' }, { status: 503 }));
    await expect(postParentLink(fakeClient(null), 'send', 'request-1')).rejects.toEqual(
      new DataRequestError('parent_email_failed'),
    );
  });
});
