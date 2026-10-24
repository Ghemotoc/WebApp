/**
 * The tag rules: look-alikes are one tag, at most 10 (story S1-E3-01).
 */
import { describe, expect, it } from 'vitest';

import { addTag, normaliseTag, tidyTag } from './tags';

describe('normaliseTag', () => {
  it('lower-cases, trims and removes diacritics, so Fantezie and fantezie are one tag', () => {
    expect(normaliseTag('Fantezie')).toBe('fantezie');
    expect(normaliseTag(' fantézie ')).toBe('fantezie');
    expect(normaliseTag('  set  in   Romania ')).toBe('set in romania');
  });

  it('treats a cedilla ş and a comma ș the same way', () => {
    expect(normaliseTag('poveşti')).toBe(normaliseTag('povești'));
    expect(normaliseTag('povești')).toBe('povesti');
  });
});

describe('addTag', () => {
  it('keeps the spelling as typed but refuses a look-alike of an existing tag', () => {
    const tags = addTag([], 'Fantezie');
    expect(tags).toEqual(['Fantezie']);
    expect(addTag(tags, 'fantezie')).toBe(tags);
    expect(addTag(tags, ' FANTÉZIE ')).toBe(tags);
  });

  it('refuses an empty tag, a tag over 40 characters and an eleventh tag', () => {
    expect(addTag([], '   ')).toEqual([]);
    expect(addTag([], 'a'.repeat(41))).toEqual([]);
    const ten = Array.from({ length: 10 }, (_, index) => `tag ${index}`);
    expect(addTag(ten, 'eleventh')).toBe(ten);
  });

  it('corrects ş and ţ in the shown form', () => {
    expect(tidyTag('poveşti')).toBe('povești');
  });
});
