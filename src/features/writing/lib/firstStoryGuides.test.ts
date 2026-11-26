/**
 * Tests for lib/firstStoryGuides.ts: which help pages the empty Write page lists, and the words
 * of each row (board D04, user story 5.4).
 */
import { describe, expect, it } from 'vitest';

import { firstStoryGuides } from './firstStoryGuides';

/** A help page as the CMS hook gives it. */
function page(entryKey: string, section: string, words: number, description?: string) {
  return {
    entryKey,
    languageCode: 'en',
    content: {
      title: `Title of ${entryKey}`,
      section,
      body: Array.from({ length: words }, () => 'word').join(' '),
      isLegal: false,
      search: description === undefined ? undefined : { title: '', description, hidden: false },
    },
  };
}

describe('firstStoryGuides', () => {
  it('lists only the first-story pages, in the order the CMS gives them', () => {
    const guides = firstStoryGuides([
      page('first-story-1-first-chapter', 'Guide', 1200, 'Start late.'),
      page('how-to-start-a-story', 'How-to guides', 300),
      page('first-story-3-keeping-it-yours', 'Rights', 600, 'What we may do.'),
      page('writers-rights', 'Rights', 400),
    ]);
    expect(guides.map((guide) => guide.key)).toEqual([
      'first-story-1-first-chapter',
      'first-story-3-keeping-it-yours',
    ]);
  });

  it('says the kind, the minutes, the line and where the guide opens', () => {
    const [guide] = firstStoryGuides([
      page('first-story-1-first-chapter', 'Guide', 1200, 'Start late.'),
    ]);
    expect(guide).toEqual({
      key: 'first-story-1-first-chapter',
      title: 'Title of first-story-1-first-chapter',
      kind: 'Guide',
      minutes: 6,
      line: 'Start late.',
      href: '/help/first-story-1-first-chapter',
      languageCode: 'en',
    });
  });

  it('leaves the line empty when staff wrote no search description', () => {
    const [guide] = firstStoryGuides([page('first-story-2-show-then-tell', 'Guide', 10)]);
    expect(guide?.line).toBe('');
    expect(guide?.minutes).toBe(1);
  });
});
