/**
 * Tests for the one-line summary of what readers see of a character (S1-E17-32, G10c4).
 */
import { describe, expect, it } from 'vitest';

import { readerSummaryOf } from './readerSummary';

const chapters = [
  { code: 'one', position: 1 },
  { code: 'two', position: 2 },
];
const fields = [
  { id: 'field-a', name: 'Favourite tea', isHidden: false },
  { id: 'field-b', name: 'Old nickname', isHidden: true },
];

describe('readerSummaryOf', () => {
  it('says a character kept private is private, whatever else is open', () => {
    const summary = readerSummaryOf({
      item: { isPrivate: true, showFrom: 'two' },
      openParts: ['basics'],
      fields,
      chapters,
    });
    expect(summary).toEqual({ kind: 'private' });
  });

  it('shows a character with no switches set from the start', () => {
    const summary = readerSummaryOf({ item: undefined, openParts: [], fields, chapters });
    expect(summary).toEqual({ kind: 'shown', chapterNumber: null, groups: [], fieldNames: [] });
  });

  it('gives the number of the chapter the character waits for', () => {
    const summary = readerSummaryOf({
      item: { isPrivate: false, showFrom: 'two' },
      openParts: [],
      fields,
      chapters,
    });
    expect(summary).toMatchObject({ kind: 'shown', chapterNumber: 2 });
  });

  it('counts a chapter that is gone as the start', () => {
    const summary = readerSummaryOf({
      item: { isPrivate: false, showFrom: 'gone' },
      openParts: [],
      fields,
      chapters,
    });
    expect(summary).toMatchObject({ kind: 'shown', chapterNumber: null });
  });

  it('lists the open groups in the sheet’s order and leaves hidden fields out', () => {
    const summary = readerSummaryOf({
      item: { isPrivate: false, showFrom: null },
      openParts: ['field-b', 'look_and_voice', 'field-a', 'basics'],
      fields,
      chapters,
    });
    expect(summary).toMatchObject({
      groups: ['basics', 'look_and_voice'],
      fieldNames: ['Favourite tea'],
    });
  });
});
