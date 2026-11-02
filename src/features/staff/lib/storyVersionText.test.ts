/**
 * Tests for how a story's version history reads and for the selected passage (bundle ADMIN-2,
 * part b2; story S1-E11-08, part 08b).
 */
import { describe, expect, it } from 'vitest';

import { createI18n } from '@/lib/i18n';

import type { StaffStoryVersion } from '../api/staffStoryHistory';
import { registerStaffTranslations } from '../registerStaffTranslations';

import { selectedPassage } from './passageSelection';
import { canRestoreVersion, storyVersionText, type VersionWords } from './storyVersionText';

/** English text, as staff who chose English see it. */
function englishT() {
  const i18n = createI18n('en');
  registerStaffTranslations(i18n);
  return i18n.getFixedT('en', 'staff');
}

/** Plain words for categories, languages and ratings, so the test reads easily. */
const words: VersionWords = {
  category: (slug) => `category ${slug ?? ''}`,
  language: (code) => `language ${code}`,
  rating: (rating) => `rating ${rating}`,
};

/** A settings version; each test changes what it needs. */
const settingsVersion: StaffStoryVersion = {
  id: 'v1',
  at: '2026-11-02T10:00:00Z',
  kind: 'settings',
  chapterNumber: null,
  changedByHandle: 'moderator',
  reasonCode: 'story_details',
  reasonText: 'Wrong shelf.',
  before: { category_slug: 'poetry', comments_enabled: true },
  after: { category_slug: 'fiction', comments_enabled: false },
  restoresVersionId: null,
  passageKept: false,
};

describe('a version in the history', () => {
  it('a settings change lists each field before and after', () => {
    expect(storyVersionText(englishT(), words, settingsVersion)).toEqual({
      heading: 'Settings',
      lines: ['Category: category poetry → category fiction', 'Comments: yes → no'],
    });
  });

  it('a removed passage counts its characters and never shows its words', () => {
    const removal: StaffStoryVersion = {
      ...settingsVersion,
      kind: 'passage',
      chapterNumber: 2,
      before: { passage: { characters: 14 } },
      after: { passage: 'removed' },
      passageKept: true,
    };
    expect(storyVersionText(englishT(), words, removal)).toEqual({
      heading: 'Chapter 2',
      lines: ['a passage of 14 characters removed'],
    });
    expect(canRestoreVersion(removal)).toBe(true);
  });

  it('a passage already put back offers no Restore', () => {
    const putBack: StaffStoryVersion = {
      ...settingsVersion,
      kind: 'passage',
      chapterNumber: 2,
      before: { passage: 'removed' },
      after: { passage: 'put_back' },
    };
    expect(storyVersionText(englishT(), words, putBack).lines).toEqual([
      'the removed passage put back',
    ]);
    expect(canRestoreVersion(putBack)).toBe(false);
  });

  it('a story hidden reads as who can find it, shown to hidden', () => {
    const hide: StaffStoryVersion = {
      ...settingsVersion,
      kind: 'visibility',
      before: { visibility: 'shown' },
      after: { visibility: 'hidden' },
    };
    expect(storyVersionText(englishT(), words, hide)).toEqual({
      heading: 'Who can find it',
      lines: ['Who can find it: shown → hidden'],
    });
  });
});

describe('the selected passage', () => {
  const chapter = 'echo one, echo two.';

  it('the second copy of the same words is sent as copy 1', () => {
    expect(selectedPassage(chapter, 10, 14, '')).toEqual({
      text: 'echo',
      occurrence: 1,
      caseReference: '',
    });
  });

  it('the first copy is copy 0, and the case reference is trimmed', () => {
    expect(selectedPassage(chapter, 0, 4, ' R-000123 ')).toEqual({
      text: 'echo',
      occurrence: 0,
      caseReference: 'R-000123',
    });
  });

  it('nothing selected, or only spaces, is no passage', () => {
    expect(selectedPassage(chapter, 3, 3, '')).toBeNull();
    expect(selectedPassage('a   b', 1, 4, '')).toBeNull();
  });
});
