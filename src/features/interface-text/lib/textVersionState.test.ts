/**
 * Tests for sorting one key's versions (story S1-E11-18 criteria 5 to 7).
 */
import { describe, expect, it } from 'vitest';

import type { TextVersion } from '../api/interfaceTextStore';

import { sortLocaleVersions } from './textVersionState';

/** A version with the fields a test cares about. */
function version(id: string, fields: Partial<TextVersion>): TextVersion {
  return {
    id,
    textKey: 'common:nav.help',
    locale: 'en',
    text: id,
    status: 'published',
    isReset: false,
    showFrom: '2026-10-01',
    publishedAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-01T10:00:00Z',
    ...fields,
  };
}

describe("sorting a key's versions", () => {
  it('the latest started version is live, a future one is scheduled and older ones can be restored', () => {
    const sorted = sortLocaleVersions(
      [
        version('old', { showFrom: '2026-10-01' }),
        version('current', { showFrom: '2026-10-20' }),
        version('future', { showFrom: '2026-11-05' }),
        version('draft', { status: 'draft', showFrom: null }),
        version('romanian', { locale: 'ro', showFrom: '2026-10-25' }),
      ],
      'en',
      '2026-10-30',
    );
    expect(sorted.live?.id).toBe('current');
    expect(sorted.scheduled?.id).toBe('future');
    expect(sorted.draft?.id).toBe('draft');
    expect(sorted.earlier.map((item) => item.id)).toEqual(['old']);
  });

  it('a reset is live but never offered for restore', () => {
    const sorted = sortLocaleVersions(
      [
        version('text', { showFrom: '2026-10-01' }),
        version('reset', { isReset: true, showFrom: '2026-10-10' }),
      ],
      'en',
      '2026-10-30',
    );
    expect(sorted.live?.isReset).toBe(true);
    expect(sorted.earlier.map((item) => item.id)).toEqual(['text']);
  });
});
