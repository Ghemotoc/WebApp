/** The link preview pictures keep the covers' colours (story S1-E4-04; server/link-preview-palette.ts). */
import { describe, expect, it } from 'vitest';

import { linkPreviewPalette } from '../../../server/link-preview-palette';

import { coverPalette } from './coverDesigns';

describe('the link preview palette', () => {
  it('has exactly the cover palette’s colours, so every cover colour has its picture', () => {
    expect(linkPreviewPalette).toEqual(coverPalette);
  });
});
