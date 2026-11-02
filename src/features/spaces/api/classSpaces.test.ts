/**
 * Tests for a class space's invite code on the screen side (bundle CLASSES, part a; story
 * S1-E8-11): how refusals read, the joining link, and how the preview and join answers are read.
 * Supabase is a small fake here; the database rules are in
 * supabase/tests/database/232-class-spaces.test.sql.
 */
import { describe, expect, it, vi } from 'vitest';

import { brand } from '@/config/brand';
import type { AppSupabaseClient } from '@/lib/supabase';

import { spaceFrom } from './spaces';
import {
  classInviteErrorFrom,
  classInviteLink,
  fetchClassInvite,
  fetchClassInvitePreview,
  joinClassSpace,
  makeClassInvite,
} from './classSpaces';

/**
 * A fake client whose rpc() answers once with the given data or error.
 *
 * @param answer - what the database sends back
 * @returns the client and the rpc spy
 */
function fakeClient(answer: { data?: unknown; error?: { code?: string; hint?: string } }) {
  const rpc = vi.fn().mockResolvedValue({ data: answer.data ?? null, error: answer.error ?? null });
  return { client: { rpc } as unknown as AppSupabaseClient, rpc };
}

describe('classInviteErrorFrom', () => {
  it('reads an ended code from its hint', () => {
    expect(classInviteErrorFrom({ hint: 'invite:ended' }).failure).toBe('ended');
  });

  it('treats a space that is not a class like a missing one, so nothing is given away', () => {
    expect(classInviteErrorFrom({ hint: 'space:not_class' }).failure).toBe('missing');
  });

  it('says to log in when a signed-out visitor is refused without a hint', () => {
    expect(classInviteErrorFrom({ code: '42501' }).failure).toBe('signed_out');
  });

  it('reads the spam limit as too many', () => {
    expect(classInviteErrorFrom({ code: '54000', hint: 'rate_limited' }).failure).toBe('too_many');
  });

  it('falls back to "couldn’t reach the server" for anything else', () => {
    expect(classInviteErrorFrom({ code: 'XX000' }).failure).toBe('unreachable');
  });
});

describe('classInviteLink', () => {
  it('builds the link from the brand config, under /class/', () => {
    expect(classInviteLink('ABCD-EFGH-JKLM')).toBe(`${brand.siteUrl}/class/ABCD-EFGH-JKLM`);
  });
});

describe('makeClassInvite', () => {
  it('sends the period and places and returns the code with its link', async () => {
    const { client, rpc } = fakeClient({
      data: { code: 'ABCD-EFGH-JKLM', expires_at: '2026-12-02T10:00:00Z', admits: 30 },
    });
    const invite = await makeClassInvite(client, { slug: 'clasa', validDays: 30, admits: 30 });
    expect(rpc).toHaveBeenCalledWith('make_class_invite', {
      slug: 'clasa',
      valid_days: 30,
      admits: 30,
    });
    expect(invite.code).toBe('ABCD-EFGH-JKLM');
    expect(invite.link).toBe(classInviteLink('ABCD-EFGH-JKLM'));
    expect(invite.admits).toBe(30);
  });

  it('throws the refusal in plain terms', async () => {
    const { client } = fakeClient({ error: { code: 'P0001', hint: 'invite:admits' } });
    await expect(
      makeClassInvite(client, { slug: 'clasa', validDays: 30, admits: 500 }),
    ).rejects.toMatchObject({ failure: 'admits' });
  });
});

describe('fetchClassInvite', () => {
  it('says there is no working code when the database sends nothing', async () => {
    const { client } = fakeClient({ data: null });
    await expect(fetchClassInvite(client, 'clasa')).resolves.toBeNull();
  });
});

describe('fetchClassInvitePreview', () => {
  it('shows the class’s name only for a working code', async () => {
    const { client } = fakeClient({
      data: { status: 'valid', space: { slug: 'clasa', name: 'Clasa a VII-a B' } },
    });
    await expect(fetchClassInvitePreview(client, 'X')).resolves.toEqual({
      status: 'valid',
      space: { slug: 'clasa', name: 'Clasa a VII-a B' },
    });
  });

  it('reads an ended code', async () => {
    const { client } = fakeClient({ data: { status: 'ended' } });
    await expect(fetchClassInvitePreview(client, 'X')).resolves.toEqual({ status: 'ended' });
  });

  it('reads anything it doesn’t know as an unknown code', async () => {
    const { client } = fakeClient({ data: { status: 'valid' } });
    await expect(fetchClassInvitePreview(client, 'X')).resolves.toEqual({ status: 'unknown' });
  });
});

describe('joinClassSpace', () => {
  it('says where the class is and whether the student can read it yet', async () => {
    const { client } = fakeClient({ data: { slug: 'clasa', can_read: false } });
    await expect(joinClassSpace(client, 'X')).resolves.toEqual({ slug: 'clasa', canRead: false });
  });
});

describe('spaceFrom for a class space', () => {
  it('reads the kind and what the viewer may do', () => {
    const space = spaceFrom({
      slug: 'clasa',
      kind: 'class',
      age_group: null,
      viewer: { can_invite: true, waits_for_account: true },
    });
    expect(space.kind).toBe('class');
    expect(space.ageGroup).toBeNull();
    expect(space.viewer.canInvite).toBe(true);
    expect(space.viewer.waitsForAccount).toBe(true);
  });
});
