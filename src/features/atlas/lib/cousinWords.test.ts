/**
 * Unit tests for the cousin phrase (bundle G10 ATLAS, part b).
 */
import { describe, expect, it } from 'vitest';

import en from '@/locales/en/atlas.json';

import { cousinPhrase } from './cousinWords';

/** Looks a "connections.cousin" key up in the English texts. */
const english = (key: string) => {
  const name = key.replace('connections.cousin.', '') as keyof typeof en.connections.cousin;
  return en.connections.cousin[name];
};

describe('cousinPhrase', () => {
  it('a first cousin is just a cousin', () => {
    expect(cousinPhrase(english, 1, 0)).toBe('cousin');
  });

  it('a second cousin once removed says both', () => {
    expect(cousinPhrase(english, 2, 1)).toBe('second cousin once removed');
  });

  it('a missing degree reads as a first cousin, not removed', () => {
    expect(cousinPhrase(english, null, null)).toBe('cousin');
  });

  it('values outside what the database allows are kept inside it', () => {
    expect(cousinPhrase(english, 7, 9)).toBe('third cousin three times removed');
  });
});
