/**
 * How a space's answers and refusals become what the screen shows (bundle FORUMS-2, part a;
 * S1-E8-06): spaceFrom(), rulesFrom(), spaceErrorFrom(), spaceFailureText(),
 * and the forums' space refusals and addresses; fetchFoundSpaces(), the search's Spaces tab (user
 * story 1.8).
 */
import { describe, expect, it, vi } from 'vitest';

import { forumWriteErrorFrom } from '@/features/forums/api/forumWrites';
import { spaceSlugOfForum } from '@/features/forums/lib/spaceForums';

import { spaceFailureText } from '../lib/spaceFailures';

import type { AppSupabaseClient } from '@/lib/supabase';

import { fetchFoundSpaces, joinNoteFrom, rulesFrom, spaceErrorFrom, spaceFrom } from './spaces';

/** A space as space_json() gives it, for a member of a 16+ space. */
const memberAnswer = {
  id: 'a01',
  slug: 'fantasy-writers-circle',
  forum_slug: 'space-fantasy-writers-circle',
  name: 'Fantasy writers’ circle',
  description: 'Magic systems and invented worlds.',
  rules: 'Fantasy only.\n\n  Say what feedback you want.  \n',
  age_group: '16_plus',
  readers: 'everybody',
  posting: 'members',
  joining: 'approve',
  banner: 'forest',
  owner: { handle: 'inkwolf', display_name: 'Ink Wolf', is_staff: false },
  member_count: 214,
  thread_count: 7,
  latest_activity_at: '2026-11-01T10:00:00Z',
  viewer: {
    membership: 'member',
    can_read: true,
    can_join: false,
    can_post: true,
    can_manage: false,
    welcome_note: 'Read the rules first.',
    show_welcome: true,
  },
};

describe('spaceFrom', () => {
  it('reads a space with its rules one a line and the viewer’s membership', () => {
    const space = spaceFrom(memberAnswer);
    expect(space.forumSlug).toBe('space-fantasy-writers-circle');
    expect(space.rules).toEqual(['Fantasy only.', 'Say what feedback you want.']);
    expect(space.ageGroup).toBe('16_plus');
    expect(space.banner).toBe('forest');
    expect(space.memberCount).toBe(214);
    expect(space.viewer).toEqual({
      membership: 'member',
      canRead: true,
      canJoin: false,
      canPost: true,
      canManage: false,
      canAppoint: false,
      canReadLog: false,
      canInvite: false,
      waitsForAccount: false,
      powers: [],
      welcomeNote: 'Read the rules first.',
      showWelcome: true,
      canHandOver: false,
      handover: null,
      moderatorInvite: null,
      isBlocked: false,
    });
  });

  it('reads an invitation to moderate and a block from the viewer (BOOKS-7)', () => {
    const viewer = {
      ...memberAnswer.viewer,
      moderator_invite: ['posts', 'members'],
      is_blocked: true,
    };
    const space = spaceFrom({ ...memberAnswer, viewer });
    expect(space.viewer.moderatorInvite).toEqual(['posts', 'members']);
    expect(space.viewer.isBlocked).toBe(true);
  });

  it('leaves the age group out when the database hides it from a reader outside the group', () => {
    const space = spaceFrom({ ...memberAnswer, age_group: null, viewer: {} });
    expect(space.ageGroup).toBeNull();
    expect(space.viewer.membership).toBeNull();
    expect(space.viewer.canPost).toBe(false);
  });

  it('falls back to the plum banner for a banner it doesn’t know', () => {
    expect(spaceFrom({ ...memberAnswer, banner: 'neon' }).banner).toBe('plum');
  });
});

describe('the notes for joining (IDEAS-3d)', () => {
  it('reads the note with a request, and none when it is missing or hidden', () => {
    expect(joinNoteFrom({ id: 'n01', text: 'I write poems.' })).toEqual({
      id: 'n01',
      text: 'I write poems.',
    });
    expect(joinNoteFrom(null)).toBeNull();
    expect(joinNoteFrom({ id: 'n01' })).toBeNull();
  });

  it('says plainly when a welcome note or a request note is too long or holds HTML', () => {
    const tooLong = spaceErrorFrom({ code: '23514', hint: 'welcome:too_long' });
    expect(spaceFailureText(tooLong)).toEqual(['failures.welcome.too_long', {}]);
    const html = spaceErrorFrom({ code: '23514', hint: 'join_note:html' });
    expect(spaceFailureText(html)).toEqual(['failures.join_note.html', {}]);
  });
});

describe('rulesFrom', () => {
  it('gives no rules for an empty box', () => {
    expect(rulesFrom('')).toEqual([]);
    expect(rulesFrom(null)).toEqual([]);
  });
});

describe('spaceErrorFrom', () => {
  it('reads who may not do it from 42501 and its hint', () => {
    expect(spaceErrorFrom({ code: '42501', hint: 'space:age' }).failure).toBe('age');
    expect(spaceErrorFrom({ code: '42501', hint: 'space:not_owner' }).failure).toBe('not_owner');
    expect(spaceErrorFrom({ code: '42501', hint: 'space:age_unknown' }).failure).toBe(
      'age_unknown',
    );
    expect(spaceErrorFrom({ code: '42501', hint: 'something' }).failure).toBe('not_active');
  });

  it('puts a taken name under the name field', () => {
    const error = spaceErrorFrom({ code: '23514', hint: 'name:taken' });
    expect(error.failure).toBe('invalid');
    expect(error.details.field).toEqual({ field: 'name', problem: 'taken' });
    expect(spaceFailureText(error)).toEqual(['failures.name.taken', {}]);
  });

  it('tells the owner they can’t leave their own space', () => {
    expect(spaceErrorFrom({ code: '23514', hint: 'space:owner' }).failure).toBe('owner_leaving');
  });

  it('reads the minutes to wait from the spam limit', () => {
    const error = spaceErrorFrom({ code: '54000', hint: 'wait_minutes:7' });
    expect(spaceFailureText(error)).toEqual(['failures.too_many', { count: 7 }]);
    const unknown = spaceErrorFrom({ code: '54000', hint: '' });
    expect(spaceFailureText(unknown)).toEqual(['failures.too_many_unknown', {}]);
  });

  it('says it couldn’t reach the server for anything else', () => {
    expect(spaceErrorFrom({ code: 'XX000' }).failure).toBe('unreachable');
  });
});

describe('the forums in a space', () => {
  it('says why a reader can’t post in a space', () => {
    expect(forumWriteErrorFrom({ code: '42501', hint: 'space:join' }).failure).toBe('space_join');
    expect(forumWriteErrorFrom({ code: '42501', hint: 'space:pending' }).failure).toBe(
      'space_pending',
    );
    expect(forumWriteErrorFrom({ code: '42501', hint: 'space:age' }).failure).toBe('space_age');
  });

  it('finds the space a forum address belongs to', () => {
    expect(spaceSlugOfForum('space-young-poets')).toBe('young-poets');
    expect(spaceSlugOfForum('first-chapters')).toBeNull();
  });
});

describe('fetchFoundSpaces (user story 1.8)', () => {
  it('asks search_spaces() for the term and one page, and reads its answer as a page', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { spaces: [memberAnswer], total: 3, has_more: true },
      error: null,
    });
    const client = { rpc } as unknown as AppSupabaseClient;
    const page = await fetchFoundSpaces(client, 'fantasy', { skip: 0, howMany: 1 });
    expect(rpc).toHaveBeenCalledWith('search_spaces', { term: 'fantasy', skip: 0, how_many: 1 });
    expect(page.total).toBe(3);
    expect(page.hasMore).toBe(true);
    expect(page.spaces[0]?.slug).toBe('fantasy-writers-circle');
  });

  it('says in plain words when the database can’t be reached', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'offline' } });
    const client = { rpc } as unknown as AppSupabaseClient;
    await expect(fetchFoundSpaces(client, 'fantasy', { skip: 0, howMany: 20 })).rejects.toThrow(
      'Could not search the spaces',
    );
  });
});
