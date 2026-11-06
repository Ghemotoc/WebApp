/**
 * Tests for the home page bands' small rules and the editor's empty parts (bundle LOOK-3).
 */
import { describe, expect, it } from 'vitest';

import { bandFields, emptyBand, emptyHomePage, withEveryPart } from './homePageFields';
import { hasBand } from './homeBands';

describe('hasBand', () => {
  it('draws a band with a heading, and leaves out an empty or missing one', () => {
    expect(hasBand({ ...emptyBand('appsBand'), heading: 'Apps come later' })).toBe(true);
    expect(hasBand(emptyBand('appsBand'))).toBe(false);
    expect(hasBand(undefined)).toBe(false);
  });
});

describe('the bands in the editor', () => {
  it('gives only the writers’ band four points', () => {
    expect(emptyBand('writeBand').points).toHaveLength(4);
    expect(emptyBand('communityBand').points).toBeUndefined();
    expect(bandFields.filter((field) => field.path.includes('.points.'))).toHaveLength(8);
  });

  it('adds empty bands and footer note to a version saved before they existed', () => {
    const older = emptyHomePage();
    delete older.writeBand;
    delete older.footerNote;
    const filled = withEveryPart(older);
    expect(filled.writeBand?.points).toHaveLength(4);
    expect(filled.footerNote).toBe('');
  });
});
