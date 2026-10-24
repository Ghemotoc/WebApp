/**
 * The new story form's rules (story S1-E3-01).
 */
import { describe, expect, it } from 'vitest';

import { newStorySchema } from './story';

const good = {
  storyId: '00000000-0000-4000-9000-000000000099',
  title: 'Stația meteo',
  blurb: 'Bunica notează vremea.',
  languageCode: 'ro',
  categorySlug: 'fiction',
  tags: ['bunici', 'familie'],
  cover: { kind: 'drawn', design: 'waves', background: 'sky', accent: 'violet' },
} as const;

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
});
