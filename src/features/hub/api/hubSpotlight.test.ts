/**
 * Tests for api/hubSpotlight.ts: how the database's answer word is read (bundle GAPS-12e).
 */
import { describe, expect, it } from 'vitest';

import { spotlightAnswerFrom } from './hubSpotlight';

describe('spotlightAnswerFrom', () => {
  it('keeps agreed and declined as they are', () => {
    expect(spotlightAnswerFrom('agreed')).toBe('agreed');
    expect(spotlightAnswerFrom('declined')).toBe('declined');
  });

  it('treats a word it does not know as still waiting, never as agreed', () => {
    expect(spotlightAnswerFrom('waiting')).toBe('waiting');
    expect(spotlightAnswerFrom('something_new')).toBe('waiting');
  });
});
