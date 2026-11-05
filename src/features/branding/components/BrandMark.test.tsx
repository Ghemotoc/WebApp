/**
 * Unit tests for the top bar's brand mark and its defaults (bundle BRAND-1, part b).
 * Who runs it: `npm test` (Vitest). The app has no database here, so the defaults show; the
 * uploaded case is tested through brandPicturesFrom(), which lays uploads over the defaults.
 */
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { brand } from '@/config/brand';
import { renderWithProviders } from '@/test/renderWithProviders';

import { brandPicturesFrom } from '../hooks/useBrandAssets';

import { BrandMark } from './BrandMark';

describe('BrandMark', () => {
  it('shows the placeholder cat emblem for each theme and the name once as text by default', () => {
    const { container } = renderWithProviders(<BrandMark />, 'en');
    expect(screen.getByText(brand.productName)).toBeInTheDocument();
    const light = container.querySelector('img[data-brand-emblem="light"]');
    const dark = container.querySelector('img[data-brand-emblem="dark"]');
    expect(light).toHaveAttribute('src', '/brand/emblem-light.svg');
    expect(dark).toHaveAttribute('src', '/brand/emblem-dark.svg');
    // The emblem is decorative: the name beside it says what the link is.
    expect(light).toHaveAttribute('alt', '');
    expect(light).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('brandPicturesFrom', () => {
  it('keeps the defaults for every slot without an approved upload', () => {
    expect(brandPicturesFrom({})).toEqual({
      logo_light: null,
      logo_dark: null,
      emblem_light: '/brand/emblem-light.svg',
      emblem_dark: '/brand/emblem-dark.svg',
    });
  });

  it('puts an approved upload in its slot and leaves the others on their defaults', () => {
    const pictures = brandPicturesFrom({ emblem_dark: 'https://example.test/e.webp' });
    expect(pictures.emblem_dark).toBe('https://example.test/e.webp');
    expect(pictures.emblem_light).toBe('/brand/emblem-light.svg');
    expect(pictures.logo_light).toBeNull();
  });
});
