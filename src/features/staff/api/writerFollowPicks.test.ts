/**
 * Unit tests for the "To follow this week" staff calls' pure helpers (user story 1.4): reading
 * what staff typed and naming why a save failed.
 */
import { describe, expect, it } from 'vitest';

import { handlesFromText, writerFollowFailureOf } from './writerFollowPicks';

describe('handlesFromText', () => {
  it('reads usernames split by commas, spaces or new lines, with or without "@"', () => {
    expect(handlesFromText('@corbu, sofia.k\n@@geo.andrei')).toEqual([
      'corbu',
      'sofia.k',
      'geo.andrei',
    ]);
  });

  it('reads an empty field as no picks, so the automatic list shows', () => {
    expect(handlesFromText('  ,  ')).toEqual([]);
  });
});

describe('writerFollowFailureOf', () => {
  it('names a refused person as not allowed', () => {
    expect(writerFollowFailureOf({ code: '42501' })).toBe('not_allowed');
  });

  it('names each check of the save by its hint', () => {
    expect(writerFollowFailureOf({ code: '23514', hint: 'unknown_writer' })).toBe('unknown_writer');
    expect(writerFollowFailureOf({ code: '23514', hint: 'may_not_show' })).toBe('may_not_show');
  });

  it('calls anything else unreachable', () => {
    expect(writerFollowFailureOf({ code: '23514', hint: 'something_new' })).toBe('unreachable');
    expect(writerFollowFailureOf({})).toBe('unreachable');
  });
});
