/**
 * Tests for shellScreens (bundle G4 SHELL): which header a page gets below 1024 px.
 */
import { describe, expect, it } from 'vitest';

import { shellScreenFor } from './shellScreens';

describe('shellScreenFor', () => {
  it('gives a browsing page such as Discover header B, with the tab bar', () => {
    expect(shellScreenFor('/discover')).toEqual({ kind: 'browse' });
    expect(shellScreenFor('/')).toEqual({ kind: 'browse' });
  });

  it('gives the chapter editor header A, with Back to the story’s chapters', () => {
    expect(shellScreenFor('/write/s/rivers/c/3')).toEqual({
      kind: 'focus',
      titleKey: 'editChapter',
      backTo: '/write/s/rivers/chapters',
    });
  });

  it('gives a chapter being read header A, so no tab bar sits over the words', () => {
    expect(shellScreenFor('/s/rivers/2')).toEqual({
      kind: 'focus',
      titleKey: 'reading',
      backTo: '/s/rivers',
    });
  });

  it('keeps the story page itself a browsing page', () => {
    expect(shellScreenFor('/s/rivers')).toEqual({ kind: 'browse' });
  });

  it('matches the more exact forum address first: a new thread is not thread "new"', () => {
    expect(shellScreenFor('/forums/writing/new')).toMatchObject({ titleKey: 'newThread' });
    expect(shellScreenFor('/forums/writing/12')).toMatchObject({
      titleKey: 'thread',
      backTo: '/forums/writing',
    });
  });

  it('writes a part of the Back address safely when the address holds odd characters', () => {
    expect(shellScreenFor('/messages/ana%20maria')).toMatchObject({ backTo: '/messages' });
    expect(shellScreenFor('/plan/s/a%26b/characters/7')).toMatchObject({
      backTo: '/plan/s/a%26b/characters',
    });
  });

  it('gives the getting-in pages header A', () => {
    expect(shellScreenFor('/sign-in')).toMatchObject({ kind: 'focus', titleKey: 'logIn' });
    expect(shellScreenFor('/join/ABC123')).toMatchObject({ kind: 'focus', titleKey: 'signUp' });
  });
});
