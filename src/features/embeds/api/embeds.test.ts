/**
 * Reading the cards the database sends with a chapter (story S1-E3-10).
 */
import { describe, expect, it } from 'vitest';

import { embedViewsFromJson } from './embeds';

const visibleId = '0b9c2f4e-3a52-4c36-9b0e-2f7d1d0e5a11';
const removedId = '1b9c2f4e-3a52-4c36-9b0e-2f7d1d0e5a11';

describe('embedViewsFromJson', () => {
  it('keeps visible and removed cards and drops anything it does not understand', () => {
    const views = embedViewsFromJson({
      [visibleId]: {
        state: 'visible',
        service: 'vimeo',
        media_path: '76979871',
        title: 'Ploaie',
        author_name: null,
      },
      [removedId]: { state: 'removed' },
      other: { state: 'visible', service: 'soundcloud', media_path: 'x' },
    });
    expect(views[visibleId]).toEqual({
      state: 'visible',
      service: 'vimeo',
      mediaPath: '76979871',
      title: 'Ploaie',
      authorName: null,
    });
    expect(views[removedId]).toEqual({ state: 'removed' });
    expect(views.other).toBeUndefined();
    expect(embedViewsFromJson(null)).toEqual({});
  });
});
