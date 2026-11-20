/**
 * Whether a pause of new comments still runs (bundle CALM-8; IDEA-20261109-8).
 */
import { describe, expect, it } from 'vitest';

import { runningPauseEnd } from './comment-pause';

const now = new Date('2026-11-20T16:40:00Z');

describe('runningPauseEnd', () => {
  it('names the end while it is still ahead', () => {
    expect(runningPauseEnd('2026-11-20T18:40:00Z', now)?.toISOString()).toBe(
      '2026-11-20T18:40:00.000Z',
    );
  });

  it('treats an end that has passed as no pause, before the job clears it', () => {
    expect(runningPauseEnd('2026-11-20T15:40:00Z', now)).toBeNull();
  });

  it('is no pause when none was set', () => {
    expect(runningPauseEnd(null, now)).toBeNull();
  });
});
