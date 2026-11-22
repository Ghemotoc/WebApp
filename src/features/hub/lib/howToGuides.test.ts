/**
 * Tests for lib/howToGuides.ts: which help pages are guides and how the hub's row pages through
 * them two at a time (bundle G9 WRITING, part a).
 */
import { describe, expect, it } from 'vitest';

import { guidePageCount, guidesOnPage, howToGuides } from './howToGuides';

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

describe('guidesOnPage', () => {
  const guides = howToGuides(pages);

  it('shows three guides on a page, so three guides fit on the first', () => {
    expect(guidesOnPage(guides, 0).shown).toHaveLength(3);
  });

  it('keeps an arrow press inside the list at either end', () => {
    expect(guidesOnPage(guides, -1).pageIndex).toBe(0);
    expect(guidesOnPage(guides, 9).pageIndex).toBe(0);
  });

  it('counts at least one page, even with no guides', () => {
    expect(guidePageCount(0)).toBe(1);
    expect(guidePageCount(3)).toBe(1);
    expect(guidePageCount(4)).toBe(2);
    expect(guidePageCount(7)).toBe(3);
  });
});
