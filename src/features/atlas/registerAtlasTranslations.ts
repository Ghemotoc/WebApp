/**
 * Adds the Story Atlas text (the "atlas" namespace) to the translations when a Story Atlas screen
 * first renders (story S1-E17-01).
 *
 * Why not with the rest: Story Atlas is loaded only when a writer opens it (src/app/router.tsx),
 * so readers never download its text. Same pattern as the comments and tags texts.
 * Who calls it: every component in src/features/atlas/components, through useAtlasTranslation().
 */
import type { i18n as I18nInstance } from 'i18next';
import { useTranslation } from 'react-i18next';

import englishAtlas from '@/locales/en/atlas.json';
import romanianAtlas from '@/locales/ro/atlas.json';

/**
 * Registers the Story Atlas texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export function registerAtlasTranslations(i18n: I18nInstance): void {
  if (i18n.hasResourceBundle('ro', 'atlas')) return;
  i18n.addResourceBundle('ro', 'atlas', romanianAtlas);
  i18n.addResourceBundle('en', 'atlas', englishAtlas);
}

/**
 * useTranslation('atlas'), after making sure the Story Atlas texts are registered.
 *
 * @returns what useTranslation('atlas') returns: t and the i18n instance
 */
export function useAtlasTranslation() {
  // Step 1: the instance this component renders with (the app's, or a test's).
  const { i18n } = useTranslation();
  // Step 2: add the Story Atlas texts to it the first time any Story Atlas component renders.
  registerAtlasTranslations(i18n);
  // Step 3: hand back the usual translation helpers for the "atlas" namespace.
  return useTranslation('atlas');
}
