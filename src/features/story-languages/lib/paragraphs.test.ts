/**
 * The paragraph rules of the side-by-side translation editor (bundle TRANSLATE-1c).
 */
import { describe, expect, it } from 'vitest';

import {
  composeTranslation,
  splitParagraphs,
  translatedCount,
  translationFields,
} from './paragraphs';

const original = [
  'Every Thursday they rehearse.',
  'She counts them.',
  'One night she counts fifteen.',
];

describe('the translation editor’s paragraphs', () => {
  it('splits a text on blank lines and drops empty paragraphs', () => {
    expect(splitParagraphs('One.\n\n\nTwo.\n \nThree.\n')).toEqual(['One.', 'Two.', 'Three.']);
    expect(splitParagraphs('')).toEqual([]);
  });

  it('starts a new translation with every field empty', () => {
    expect(translationFields(original, '')).toEqual(['', '', '']);
  });

  it('saves the original in place of a paragraph left empty', () => {
    const body = composeTranslation(original, ['În fiecare joi repetă.', '  ', '']);
    expect(body).toBe(
      'În fiecare joi repetă.\n\nShe counts them.\n\nOne night she counts fifteen.',
    );
  });

  it('reads a saved translation back with the untranslated paragraphs empty again', () => {
    const body = composeTranslation(original, ['În fiecare joi repetă.', '', '']);
    const fields = translationFields(original, body);
    expect(fields).toEqual(['În fiecare joi repetă.', '', '']);
    expect(translatedCount(fields)).toBe(1);
  });

  it('keeps extra paragraphs of a longer draft in the last field', () => {
    const fields = translationFields(original, 'Unu.\n\nDoi.\n\nTrei.\n\nPatru.');
    expect(fields).toEqual(['Unu.', 'Doi.', 'Trei.\n\nPatru.']);
  });

  it('saves a blank line inside a field as a line break, so later paragraphs stay on their rows', () => {
    const body = composeTranslation(original, ['Unu.\n\nÎncă unu.', 'Doi.', 'Trei.']);
    expect(translationFields(original, body)).toEqual(['Unu.\nÎncă unu.', 'Doi.', 'Trei.']);
  });
});
