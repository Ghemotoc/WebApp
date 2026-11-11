/**
 * Unit tests for the cards and steps of the page builder (story S1-E11-34; bundle CMS-2b).
 */
import { describe, expect, it } from 'vitest';

import { landingEntryCounts } from '@/schemas/landingPages';

import { newBlock } from './blocks';
import { addEntry, entriesOf, isEntryKind, removeEntry, withEntryPart } from './entries';

describe('cards and steps', () => {
  it('a new Cards block starts with the fewest cards, empty, in both languages', () => {
    const block = newBlock('cards', 'block-1');
    expect(entriesOf(block, 'ro')).toHaveLength(landingEntryCounts.cards.fewest);
    expect(entriesOf(block, 'en')).toEqual(entriesOf(block, 'ro'));
    expect(entriesOf(block, 'en')[0]).toEqual({ title: '', body: '' });
  });

  it('only Cards and Steps have entries', () => {
    expect(isEntryKind('cards')).toBe(true);
    expect(isEntryKind('steps')).toBe(true);
    expect(isEntryKind('quote')).toBe(false);
    expect(entriesOf(newBlock('text', 'block-1'), 'en')).toEqual([]);
  });

  it('adding and removing a step keeps both languages the same length', () => {
    const added = addEntry(newBlock('steps', 'block-1'));
    expect(entriesOf(added, 'ro')).toHaveLength(3);
    expect(entriesOf(added, 'en')).toHaveLength(3);
    const removed = removeEntry(added, 0);
    expect(entriesOf(removed, 'ro')).toHaveLength(2);
    expect(entriesOf(removed, 'en')).toHaveLength(2);
  });

  it('changing one card’s title leaves the other language and the other cards alone', () => {
    const block = withEntryPart(
      newBlock('cards', 'block-1'),
      { language: 'en', index: 1, part: 'title' },
      'Write',
    );
    expect(entriesOf(block, 'en')[1]?.title).toBe('Write');
    expect(entriesOf(block, 'en')[0]?.title).toBe('');
    expect(entriesOf(block, 'ro')[1]?.title).toBe('');
  });
});
