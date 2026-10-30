/**
 * Tests for the interface text catalogue (story S1-E11-18 criteria 1, 3, 8 and 11).
 */
import { describe, expect, it } from 'vitest';

import { buildCatalogue, isLegalWording, placeholdersOf, searchCatalogue } from './localeCatalogue';

const files = {
  '/src/locales/en/common.json': {
    nav: { help: 'Help' },
    items_one: '{{count}} item',
    items_other: '{{count}} items',
  },
  '/src/locales/ro/common.json': {
    nav: { help: 'Ajutor' },
    items_one: '{{count}} element',
    items_other: '{{count}} elemente',
  },
  '/src/locales/en/legal.json': { title: 'Legal' },
};

describe('the interface text catalogue', () => {
  it('lists every key once with its text in each language', () => {
    const catalogue = buildCatalogue(files);
    expect(catalogue.find((entry) => entry.textKey === 'common:nav.help')?.fileTexts).toEqual({
      en: 'Help',
      ro: 'Ajutor',
    });
  });

  it('gives each plural form its own row', () => {
    const keys = buildCatalogue(files).map((entry) => entry.textKey);
    expect(keys).toContain('common:items_one');
    expect(keys).toContain('common:items_other');
  });

  it('finds a key by the Romanian words on screen or by the key', () => {
    const catalogue = buildCatalogue(files);
    expect(searchCatalogue(catalogue, 'ajutor').map((entry) => entry.textKey)).toEqual([
      'common:nav.help',
    ]);
    expect(searchCatalogue(catalogue, 'nav.help')).toHaveLength(1);
  });

  it('marks legal wording', () => {
    const catalogue = buildCatalogue(files);
    const legal = catalogue.filter((entry) => entry.namespace === 'legal');
    const help = catalogue.filter((entry) => entry.textKey === 'common:nav.help');
    expect(legal.map(isLegalWording)).toEqual([true]);
    expect(help.map(isLegalWording)).toEqual([false]);
  });

  it('reads placeholders sorted and once each', () => {
    expect(placeholdersOf('{{productName}} has {{count}} and {{count}}')).toEqual([
      'count',
      'productName',
    ]);
    expect(placeholdersOf('No placeholders')).toEqual([]);
  });

  it('the real locale files give every key a Romanian and an English text', () => {
    const missing = buildCatalogue().filter(
      (entry) => entry.fileTexts.ro === undefined || entry.fileTexts.en === undefined,
    );
    expect(missing.map((entry) => entry.textKey)).toEqual([]);
  });
});
