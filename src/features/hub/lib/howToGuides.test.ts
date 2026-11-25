/**
 * Tests for lib/howToGuides.ts: which help pages are guides and how the hub's row pages through
 * them two at a time (bundle G9 WRITING, part a).
 */
import { describe, expect, it } from 'vitest';

import { howToGuides } from './howToGuides';

/** Five help pages: three guides and two others. */
const pages = [
  { entryKey: 'getting-started' },
  { entryKey: 'how-to-start-a-story' },
  { entryKey: 'how-to-schedule-chapters' },
  { entryKey: 'writers-rights' },
  { entryKey: 'how-to-messages' },
];

describe('howToGuides', () => {
  it('keeps only the pages whose address starts with how-to-, in the CMS order', () => {
    expect(howToGuides(pages).map((page) => page.entryKey)).toEqual([
      'how-to-start-a-story',
      'how-to-schedule-chapters',
      'how-to-messages',
    ]);
  });
});
