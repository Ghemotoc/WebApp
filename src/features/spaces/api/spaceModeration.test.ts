/**
 * How space moderators' answers and refusals become what the screen shows (bundle FORUMS-2,
 * part b; S1-E8-07): the viewer's powers, the moderators' refusals, a log line, the power
 * checkboxes and the log's words.
 */
import { describe, expect, it } from 'vitest';

import { spaceFailureText } from '../lib/spaceFailures';
import { logActionKey } from '../lib/spaceLogText';
import { powerKeys, samePowers, togglePower } from '../lib/spacePowers';

import { logEntryFrom } from './spaceModeration';
import { powersFrom, spaceErrorFrom, spaceFrom } from './spaces';

describe('a moderator’s place in a space', () => {
  it('reads a moderator’s membership and powers, and that they can’t appoint or read the log', () => {
    const space = spaceFrom({
      slug: 'fantasy-writers-circle',
      viewer: {
        membership: 'moderator',
        can_manage: false,
        can_appoint: false,
        can_read_log: false,
        powers: ['posts', 'members'],
      },
    });
    expect(space.viewer).toMatchObject({
      membership: 'moderator',
      canManage: false,
      canAppoint: false,
      canReadLog: false,
      powers: ['posts', 'members'],
    });
  });

  it('keeps only the powers it knows', () => {
    expect(powersFrom(['settings', 'fly', 'posts'])).toEqual(['posts', 'settings']);
    expect(powersFrom(null)).toEqual([]);
  });
});

describe('the moderators’ refusals', () => {
  it('says a moderator lacks the power for this', () => {
    const failure = spaceErrorFrom({ code: '42501', hint: 'space:not_allowed' });
    expect(spaceFailureText(failure)).toEqual(['failures.not_allowed', {}]);
  });

  it('says the username isn’t a member, the owner has every power, or the age group differs', () => {
    expect(spaceErrorFrom({ code: 'P0002', hint: 'member:missing' }).failure).toBe(
      'member_missing',
    );
    expect(spaceErrorFrom({ code: '23514', hint: 'member:owner' }).failure).toBe('member_owner');
    expect(spaceErrorFrom({ code: '23514', hint: 'member:age' }).failure).toBe('member_age');
    expect(spaceErrorFrom({ code: '23514', hint: 'reason:too_long' }).failure).toBe(
      'reason_too_long',
    );
  });

  it('still says a space that isn’t there is missing', () => {
    expect(spaceErrorFrom({ code: 'P0002', hint: 'space:missing' }).failure).toBe('missing');
    expect(spaceErrorFrom({ code: 'P0002', hint: '' }).failure).toBe('missing');
  });
});

describe('a line of the space’s log', () => {
  it('reads our moderation team as no actor, the thread and the powers given', () => {
    const entry = logEntryFrom({
      actor: null,
      action: 'moderator_appointed',
      target: { handle: 'ana', display_name: 'Ana', is_staff: false },
      thread: null,
      note: null,
      details: { powers_before: [], powers_after: ['members', 'posts'] },
      created_at: '2026-11-02T10:00:00Z',
    });
    expect(entry.actor).toBeNull();
    expect(entry.target?.handle).toBe('ana');
    expect(entry.powersAfter).toEqual(['posts', 'members']);
  });

  it('reads a thread that is still there as its number and title', () => {
    const entry = logEntryFrom({ action: 'thread_locked', thread: { number: 12, title: 'Fir' } });
    expect(entry.thread).toEqual({ number: 12, title: 'Fir' });
  });

  it('says "made a change" for an action this version doesn’t know', () => {
    expect(logActionKey('thread_locked')).toBe('log.actions.thread_locked');
    expect(logActionKey('space_painted')).toBe('log.actions.other');
  });
});

describe('the power checkboxes', () => {
  it('keeps the powers in the screens’ order however they are ticked', () => {
    expect(togglePower(['settings'], 'posts', true)).toEqual(['posts', 'settings']);
    expect(togglePower(['posts', 'settings'], 'posts', false)).toEqual(['settings']);
  });

  it('knows when nothing changed, whatever the order', () => {
    expect(samePowers(['members', 'posts'], ['posts', 'members'])).toBe(true);
    expect(samePowers(['posts'], ['posts', 'members'])).toBe(false);
  });

  it('names the powers held with the words for a list', () => {
    expect(powerKeys(['settings', 'posts'])).toEqual([
      'moderators.powerWords.posts',
      'moderators.powerWords.settings',
    ]);
  });
});
