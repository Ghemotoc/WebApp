/**
 * detailsJson(): what the staff Classics forms send to the database (story S1-E11-16; the
 * edition and translation-rights fields are bundle TRANSLATE-1d).
 */
import { describe, expect, it } from 'vitest';

import { detailsJson, emptyClassicDetails } from './classics';

describe('detailsJson', () => {
  it('sends a first edition with no rights chosen as nulls, never as empty text', () => {
    const json = detailsJson({ ...emptyClassicDetails, title: '  Amintiri  ' });
    expect(json.title).toBe('Amintiri');
    expect(json.translator_name).toBeNull();
    expect(json.translation_rights).toBeNull();
    expect(json.edition_of_story_id).toBeNull();
  });

  it('sends an edition with its classic, its translator and its translation rights', () => {
    const json = detailsJson({
      ...emptyClassicDetails,
      languageCode: 'en',
      translatorName: ' Ana Vlad ',
      translatorDiedYear: '1950',
      translationRights: 'public_domain',
      editionOfStoryId: 'first-edition-id',
    });
    expect(json.language_code).toBe('en');
    expect(json.translator_name).toBe('Ana Vlad');
    expect(json.translator_died_year).toBe(1950);
    expect(json.translation_rights).toBe('public_domain');
    expect(json.edition_of_story_id).toBe('first-edition-id');
  });
});
