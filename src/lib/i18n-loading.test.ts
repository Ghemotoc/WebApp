/**
 * Tests for loading English only when it is used (the reader speed fix, 21 Nov 2026).
 * What it checks: createI18n's changeLanguage() puts the English text in before it switches, and
 * leaves alone the English text that is there already.
 * Note: src/test/setup.ts registers English up front, so "downloading" here reads that registry.
 */
import { describe, expect, it } from 'vitest';

import { createI18n } from '@/lib/i18n';
import { registerPeopleTranslations } from '@/features/people/registerPeopleTranslations';
import englishPeople from '@/locales/en/people.json';
import englishReading from '@/locales/en/reading.json';

describe('loading English when someone switches to it', () => {
  it('switching to English puts in an English namespace the instance was missing', async () => {
    // An instance that has lost its English reading text, as a page that started in Romanian would be.
    const i18n = createI18n('ro');
    i18n.removeResourceBundle('en', 'reading');
    expect(i18n.hasResourceBundle('en', 'reading')).toBe(false);

    await i18n.changeLanguage('en');

    expect(i18n.language).toBe('en');
    expect(i18n.getResourceBundle('en', 'reading')).toEqual(englishReading);
  });

  it('a reader feature brings only its Romanian text; its English arrives with the switch', async () => {
    // A page that started in Romanian and drew a people component (the writer's card in the reader).
    const i18n = createI18n('ro');
    i18n.removeResourceBundle('en', 'people');
    registerPeopleTranslations(i18n);
    expect(i18n.hasResourceBundle('ro', 'people')).toBe(true);
    expect(i18n.hasResourceBundle('en', 'people')).toBe(false);

    await i18n.changeLanguage('en');

    expect(i18n.getResourceBundle('en', 'people')).toEqual(englishPeople);
  });

  it('English text already in the instance, such as an admin override, is kept', async () => {
    const i18n = createI18n('ro');
    i18n.addResource('en', 'common', 'speedFixProbe', 'Kept as it was');

    await i18n.changeLanguage('en');

    expect(i18n.t('speedFixProbe')).toBe('Kept as it was');
  });

  it('switching to Romanian needs no download and switches at once', async () => {
    const i18n = createI18n('en');
    await i18n.changeLanguage('ro');
    expect(i18n.language).toBe('ro');
  });
});
