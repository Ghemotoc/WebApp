/**
 * The story forms' rules (stories S1-E3-01 and S1-E3-06: the labels).
 */
import { describe, expect, it } from 'vitest';

import { newStorySchema, storySettingsSchema } from './story';

const good = {
  storyId: '00000000-0000-4000-9000-000000000099',
  title: 'Stația meteo',
  blurb: 'Bunica notează vremea.',
  languageCode: 'ro',
  categorySlug: 'fiction',
  tags: ['bunici', 'familie'],
  cover: { kind: 'drawn', design: 'waves', background: 'sky', accent: 'violet' },
  rating: 'all_ages',
  isFanFiction: false,
  isParody: false,
  dealsWithAbuseOrCoercion: false,
  contentNote: '',
  aiDisclosure: 'no_ai',
} as const;

/** The issues as [field, message key] pairs. */
function issuesOf(answers: unknown) {
  const result = newStorySchema.safeParse(answers);
  return result.success
    ? []
    : result.error.issues.map((issue) => [issue.path.join('.'), issue.message]);
}

describe('newStorySchema', () => {
  it('accepts a complete story', () => {
    expect(newStorySchema.safeParse(good).success).toBe(true);
    expect(newStorySchema.safeParse({ ...good, cover: { kind: 'automatic' } }).success).toBe(true);
  });

  it('names the field and the message key for each mistake', () => {
    const result = newStorySchema.safeParse({
      ...good,
      title: '   ',
      tags: ['Fantezie', 'fantezie'],
      cover: { kind: 'drawn', design: 'waves', background: 'sky', accent: '#6E93BF' },
    });
    expect(result.success).toBe(false);
    const issues = result.error?.issues.map((issue) => [issue.path.join('.'), issue.message]);
    expect(issues).toContainEqual(['title', 'errors.titleMissing']);
    expect(issues).toContainEqual(['tags', 'errors.duplicateTag']);
    expect(issues?.some(([path]) => path === 'cover.accent')).toBe(true);
  });

  it('refuses an eleventh tag and a title over 120 characters', () => {
    const tags = Array.from({ length: 11 }, (_, index) => `tag ${index}`);
    expect(newStorySchema.safeParse({ ...good, tags }).success).toBe(false);
    expect(newStorySchema.safeParse({ ...good, title: 'a'.repeat(121) }).success).toBe(false);
  });

  it('asks for a rating and an AI answer before saving (S1-E3-06)', () => {
    const issues = issuesOf({ ...good, rating: null, aiDisclosure: null });
    expect(issues).toContainEqual(['rating', 'errors.ratingRequired']);
    expect(issues).toContainEqual(['aiDisclosure', 'errors.aiRequired']);
  });

  it('a story about abuse or coercion needs 16+ or 18+ and a content note', () => {
    const abuse = { ...good, dealsWithAbuseOrCoercion: true };
    expect(issuesOf({ ...abuse, rating: '13_plus' })).toContainEqual([
      'rating',
      'errors.abuseNeedsRating',
    ]);
    expect(issuesOf({ ...abuse, rating: '16_plus' })).toContainEqual([
      'contentNote',
      'errors.abuseNeedsNote',
    ]);
    expect(issuesOf({ ...abuse, rating: '16_plus', contentNote: 'Abuz în familie.' })).toEqual([]);
    expect(issuesOf({ ...abuse, rating: '18_plus', contentNote: 'Abuz în familie.' })).toEqual([]);
  });

  it('refuses a content note over 300 characters, on both forms', () => {
    const long = { ...good, contentNote: 'a'.repeat(301) };
    expect(issuesOf(long)).toContainEqual(['contentNote', 'errors.contentNoteTooLong']);
    const result = storySettingsSchema.safeParse({
      ...long,
      completionStatus: 'ongoing',
      commentsEnabled: true,
      quoteCardsEnabled: true,
    });
    expect(result.success).toBe(false);
  });
});
