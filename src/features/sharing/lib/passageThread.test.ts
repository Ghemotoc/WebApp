/**
 * Tests for the first post of a thread started from a chapter passage (IDEAS-3f, idea
 * IDEA-20261102-10). Runs with Vitest (`npm test`).
 */
import { describe, expect, it } from 'vitest';

import { initialBodyFrom, passageThreadBody } from './passageThread';

const address = { storySlug: 'ploaia', chapterCode: 'abcd1234' };

describe('passageThreadBody', () => {
  it('quotes the passage and links back to it', () => {
    const body = passageThreadBody('  Ploua peste oraș.  ', 'From chapter 3 of “Ploaia”', {
      address,
      blocks: { first: 2, last: 3 },
    });
    expect(body.startsWith('> Ploua peste oraș.\n\n[From chapter 3 of “Ploaia”](')).toBe(true);
    expect(body).toContain('/s/ploaia/abcd1234/p2-3)');
  });

  it('keeps square brackets in a title from breaking the link', () => {
    const body = passageThreadBody('x', 'From chapter 1 of “[Draft]”', {
      address,
      blocks: { first: 1, last: 1 },
    });
    expect(body).toContain('[From chapter 1 of “(Draft)”](');
  });
});

describe('initialBodyFrom', () => {
  it('reads the draft a passage button sent', () => {
    expect(initialBodyFrom({ initialBody: '> hi' })).toBe('> hi');
  });

  it('gives an empty body for a page opened any other way', () => {
    expect(initialBodyFrom(null)).toBe('');
    expect(initialBodyFrom({ initialBody: 3 })).toBe('');
  });
});
