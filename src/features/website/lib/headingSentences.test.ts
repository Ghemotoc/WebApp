/** Tests for splitHeadingSentences (user story 1.2, board A02's two-colour heading). */
import { describe, expect, it } from 'vitest';

import { splitHeadingSentences } from './headingSentences';

describe('splitHeadingSentences', () => {
  it('splits a two-sentence heading after the first sentence', () => {
    expect(splitHeadingSentences('You own your work. You decide where it goes.')).toEqual({
      first: 'You own your work.',
      rest: 'You decide where it goes.',
    });
  });

  it('keeps a one-sentence heading whole', () => {
    expect(splitHeadingSentences('Why write here')).toEqual({ first: 'Why write here', rest: '' });
  });

  it('splits after a question mark too', () => {
    expect(splitHeadingSentences('Who owns it? You do.')).toEqual({
      first: 'Who owns it?',
      rest: 'You do.',
    });
  });
});
