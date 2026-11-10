/**
 * Tests for the quote card's "Story cover" colour background (bundle GAPS-7, part b).
 * Who runs it: `npm test` (Vitest).
 */
import { describe, expect, it } from 'vitest';

import { resolveCoverChoice } from '@/components/covers/automaticCover';
import { coverPalette } from '@/components/covers/coverDesigns';

import type { SharedCover } from '../api/sharing';

import { coverColourBackground } from './coverBackground';

const storyId = '32900000-0000-4000-8000-000000000001';

/** A cover as share_options() describes it. */
function cover(changes: Partial<SharedCover>): SharedCover {
  return { kind: 'automatic', storyId, design: null, background: null, accent: null, ...changes };
}

describe('coverColourBackground', () => {
  it('uses the colour the writer chose, with dark words on a light colour', () => {
    const background = coverColourBackground(
      cover({ kind: 'drawn', design: 'stripes', background: 'sage', accent: 'plum' }),
    );
    expect(background).toEqual({ key: 'cover', colours: [coverPalette.sage], isLight: true });
  });

  it('takes light words on a dark colour', () => {
    const background = coverColourBackground(
      cover({ kind: 'drawn', design: 'starry', background: 'ink', accent: 'gold' }),
    );
    expect(background.isLight).toBe(false);
  });

  it('draws an automatic cover from the story’s ID, the same as every other screen', () => {
    const expected = resolveCoverChoice({ id: storyId, coverKind: 'automatic', drawnCover: null });
    expect(coverColourBackground(cover({})).colours).toEqual([coverPalette[expected.background]]);
  });

  it('falls back to the automatic cover for an upload or an unknown design', () => {
    const automatic = coverColourBackground(cover({})).colours;
    expect(coverColourBackground(cover({ kind: 'upload' })).colours).toEqual(automatic);
    expect(
      coverColourBackground(
        cover({ kind: 'drawn', design: 'neon', background: 'sage', accent: 'plum' }),
      ).colours,
    ).toEqual(automatic);
  });
});
