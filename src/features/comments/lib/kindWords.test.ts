/**
 * Tests for the kind-words check (bundle ADMIN-2, part d3; Robert, 2 Nov 2026).
 */
import { describe, expect, it } from 'vitest';

import { foldForKindWords, hasUnkindWords } from './kindWords';

const phrases = ['kys', 'kill yourself', 'idiot', 'proastă', 'omoară-te', 'you’re worthless'];

describe('the kind-words check', () => {
  it('finds a phrase as whole words, whatever the case', () => {
    expect(hasUnkindWords('Honestly, KYS.', phrases)).toBe(true);
    expect(hasUnkindWords('just kill   yourself', phrases)).toBe(true);
  });

  it('ignores Romanian accents and the old cedilla letters', () => {
    expect(hasUnkindWords('Ești proasta', phrases)).toBe(true);
    expect(hasUnkindWords('esti proaştă', phrases)).toBe(true);
    expect(hasUnkindWords('omoara-te', phrases)).toBe(true);
  });

  it('matches straight and curly apostrophes alike', () => {
    expect(hasUnkindWords("you're worthless", phrases)).toBe(true);
  });

  it('doesn’t match a phrase inside a longer word', () => {
    expect(hasUnkindWords('An idiotproof plan, skyscrapers and kysely.', phrases)).toBe(false);
  });

  it('says nothing about a kind comment or an empty list', () => {
    expect(hasUnkindWords('I loved the lift scene.', phrases)).toBe(false);
    expect(hasUnkindWords('idiot', [])).toBe(false);
    expect(hasUnkindWords('idiot', ['   '])).toBe(false);
  });

  it('folds text to lower case without accents', () => {
    expect(foldForKindWords('Ș ț Ă')).toBe('s t a');
  });
});
