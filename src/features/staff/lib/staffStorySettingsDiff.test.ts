/**
 * Tests for the settings staff changed and the reason check (bundle ADMIN-2, part b1; S1-E11-08).
 */
import { describe, expect, it } from 'vitest';

import type { StaffStorySettings } from '../api/staffStories';

import { completeReason, settingsChange, tagNamesFrom } from './staffStorySettingsDiff';

const saved: StaffStorySettings = {
  rating: 'all_ages',
  completionStatus: 'ongoing',
  commentsEnabled: true,
  categorySlug: 'fiction',
  languageCode: 'ro',
  isFanFiction: false,
  isParody: false,
  dealsWithAbuseOrCoercion: false,
  tagNames: ['family', 'mystery'],
};

describe('the settings staff changed', () => {
  it('sends nothing when nothing changed', () => {
    expect(settingsChange(saved, { ...saved })).toEqual({});
  });

  it('sends only the fields that changed', () => {
    expect(settingsChange(saved, { ...saved, rating: '16_plus', commentsEnabled: false })).toEqual({
      rating: '16_plus',
      commentsEnabled: false,
    });
  });

  it('treats the same tags in another order as no change', () => {
    expect(settingsChange(saved, { ...saved, tagNames: ['mystery', 'family'] })).toEqual({});
  });

  it('sends the whole tag list when one tag goes', () => {
    expect(settingsChange(saved, { ...saved, tagNames: ['family'] })).toEqual({
      tagNames: ['family'],
    });
  });
});

describe('typed tags', () => {
  it('splits on commas, trims and drops empty names and repeats', () => {
    expect(tagNamesFrom(' family, , mystery,family ')).toEqual(['family', 'mystery']);
  });
});

describe('a reason', () => {
  it('needs a code from the list and some words', () => {
    expect(completeReason({ code: '', text: 'Wrong category' })).toBeNull();
    expect(completeReason({ code: 'story_details', text: '   ' })).toBeNull();
    expect(completeReason({ code: 'because', text: 'Wrong category' })).toBeNull();
    expect(completeReason({ code: 'story_details', text: ' Wrong category ' })).toEqual({
      code: 'story_details',
      text: 'Wrong category',
    });
  });

  it('refuses more than 1000 characters', () => {
    expect(completeReason({ code: 'other', text: 'a'.repeat(1001) })).toBeNull();
  });
});
