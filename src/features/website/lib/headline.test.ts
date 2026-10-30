/**
 * Tests for splitAroundWord (story S1-E11-06).
 */
import { describe, expect, it } from 'vitest';

import { splitAroundWord } from './headline';

describe('splitAroundWord', () => {
  it('underlines the chosen word and keeps the full stop after it', () => {
    expect(splitAroundWord('Get read.', 'read')).toEqual({
      before: 'Get ',
      underlined: 'read',
      after: '.',
    });
  });

  it('leaves a line alone when the word is not in it', () => {
    expect(splitAroundWord('Write stories.', 'read')).toEqual({
      before: 'Write stories.',
      underlined: '',
      after: '',
    });
  });

  it('underlines nothing when no word is chosen', () => {
    expect(splitAroundWord('Fii citit.', '  ').underlined).toBe('');
  });
});
