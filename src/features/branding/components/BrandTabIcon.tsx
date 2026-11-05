/**
 * BrandTabIcon: puts the approved emblem in the browser tab (bundle BRAND-1, part b; Robert,
 * 4 Nov 2026: "emblems apply to favicon").
 *
 * index.html starts with the bundled emblem: the light one when the browser is light and the dark
 * one when it is dark (media="(prefers-color-scheme: …)"), plus a small PNG for browsers that
 * can't show an SVG icon. The tab follows the browser's own light or dark mode, not the page
 * theme, because the tab strip is drawn by the browser. Once an uploaded emblem is approved, this
 * swaps the address of the matching <link data-brand-icon> and puts the default back if the
 * upload goes away. It draws nothing.
 * Who shows it: AppLayout and StaffLayout, once per page. What it calls: useBrandAssets().
 */
import { useEffect } from 'react';

import { useBrandAssets } from '../hooks/useBrandAssets';

/**
 * Points one tab icon link at a picture.
 *
 * @param which - "light" or "dark", the link's data-brand-icon value
 * @param address - the picture's address
 */
function pointTabIcon(which: 'light' | 'dark', address: string): void {
  const link = document.querySelector<HTMLLinkElement>(`link[data-brand-icon="${which}"]`);
  // A page without the links (a unit test) has nothing to change.
  if (link === null || link.href.endsWith(address)) return;
  link.href = address;
  // The bundled default is an SVG; an upload is WebP or PNG, so let the browser read the type.
  if (address.endsWith('.svg')) link.type = 'image/svg+xml';
  else link.removeAttribute('type');
}

/**
 * Keeps the tab icons in step with the approved emblems.
 *
 * @returns nothing; it only changes the page's <head>
 */
export function BrandTabIcon() {
  const pictures = useBrandAssets();
  useEffect(() => {
    if (pictures.emblem_light !== null) pointTabIcon('light', pictures.emblem_light);
    if (pictures.emblem_dark !== null) pointTabIcon('dark', pictures.emblem_dark);
  }, [pictures.emblem_light, pictures.emblem_dark]);
  return null;
}
