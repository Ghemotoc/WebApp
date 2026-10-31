/**
 * Tests for lib/crossLinks.ts: [[Name]] links found, resolved ignoring capitals, and missing ones
 * left unresolved (story S1-E17-31).
 */
import { describe, expect, it } from 'vitest';

import type { LinkTarget } from '../api/links';

import { buildLinkIndex, linkNamesIn, resolveCrossLink, splitCrossLinks } from './crossLinks';

const ana: LinkTarget = { kind: 'character', ref: 'a1', title: 'Ana', names: ['Ana', 'Ani'] };
const lighthouse: LinkTarget = { kind: 'entry', ref: 'e1', title: 'Farul', names: ['Farul'] };
const sameNameChapter: LinkTarget = { kind: 'chapter', ref: 'c1', title: 'Ana', names: ['Ana'] };

describe('splitCrossLinks', () => {
  it('cuts a text into plain pieces and links, in order', () => {
    expect(splitCrossLinks('Ask [[Ana]] about [[ Farul ]].')).toEqual([
      { kind: 'text', text: 'Ask ' },
      { kind: 'link', name: 'Ana' },
      { kind: 'text', text: ' about ' },
      { kind: 'link', name: 'Farul' },
      { kind: 'text', text: '.' },
    ]);
  });

  it('leaves a text without links as one piece, and an empty text as none', () => {
    expect(splitCrossLinks('No links here.')).toEqual([{ kind: 'text', text: 'No links here.' }]);
    expect(splitCrossLinks('')).toEqual([]);
  });

  it('keeps empty brackets and links across a line break as plain text', () => {
    expect(splitCrossLinks('[[ ]] and [[An\na]]')).toEqual([
      { kind: 'text', text: '[[ ]] and [[An\na]]' },
    ]);
  });
});

describe('linkNamesIn', () => {
  it('lists each name once, ignoring capitals, as first written', () => {
    expect(linkNamesIn('[[Ana]], [[ANA]] and [[Farul]]')).toEqual(['Ana', 'Farul']);
  });
});

describe('resolveCrossLink', () => {
  const index = buildLinkIndex([ana, lighthouse, sameNameChapter]);

  it('finds a character by name or alias, ignoring capitals', () => {
    expect(resolveCrossLink('ana', index)).toBe(ana);
    expect(resolveCrossLink(' ANI ', index)).toBe(ana);
  });

  it('finds an entry by its title', () => {
    expect(resolveCrossLink('farul', index)).toBe(lighthouse);
  });

  it('gives a shared name to the first target: characters before chapters', () => {
    expect(resolveCrossLink('Ana', index)).toBe(ana);
  });

  it('answers null for a name nothing has yet', () => {
    expect(resolveCrossLink('Bogdan', index)).toBeNull();
  });
});
