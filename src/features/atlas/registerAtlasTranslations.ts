/**
 * Adds the Story Atlas text (the "atlas" namespace) to the translations when a Story Atlas screen
 * first renders (story S1-E17-01).
 *
 * Why not with the rest: Story Atlas is loaded only when a writer opens it (src/app/router.tsx),
 * so readers never download its text. Same pattern as the comments and tags texts.
 * Who calls it: every component in src/features/atlas/components, through useAtlasTranslation().
 */
import { createNamespaceTranslations } from '@/lib/namespace-translations';
import englishAtlas from '@/locales/en/atlas.json';
import romanianAtlas from '@/locales/ro/atlas.json';

const atlasTranslations = createNamespaceTranslations('atlas', romanianAtlas, englishAtlas);

/**
 * Registers the Story Atlas texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export const registerAtlasTranslations = atlasTranslations.register;

/**
 * useTranslation('atlas'), after making sure the Story Atlas texts are registered.
 *
 * @returns what useTranslation('atlas') returns: t and the i18n instance
 */
export const useAtlasTranslation = atlasTranslations.useNamespaceTranslation;
