/**
 * Tests for how "This answered it" refusals read (IDEAS-3f, idea IDEA-20261102-8). Runs with
 * Vitest (`npm test`).
 */
import { describe, expect, it } from 'vitest';

import { forumAnswerErrorFrom } from './forumAnswers';

describe('forumAnswerErrorFrom', () => {
  it('says only the starter can mark an answer (criterion 2)', () => {
    expect(forumAnswerErrorFrom({ code: '42501', hint: 'answer:not_starter' }).failure).toBe(
      'not_starter',
    );
  });

  it('says the opening post or the starter’s own reply can’t be the answer', () => {
    expect(forumAnswerErrorFrom({ code: '23514', hint: 'answer:not_reply' }).failure).toBe(
      'not_reply',
    );
  });

  it('says a missing thread is gone, and anything else is unreachable', () => {
    expect(forumAnswerErrorFrom({ code: 'P0002' }).failure).toBe('gone');
    expect(forumAnswerErrorFrom({ code: '08006' }).failure).toBe('unreachable');
  });
});
