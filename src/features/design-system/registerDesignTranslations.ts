/**
 * Adds the /design page's own text (the "design" namespace) to the translations when the page
 * loads (story S1-E1-03).
 *
 * Why not with the rest: the /design page is left out of production builds (decided 17 Oct 2026),
 * so its text shouldn't ship in the main bundle either. This file is only imported by the lazily
 * loaded DesignPage, so the text arrives with the page.
 * Who calls it: DesignPage, before it renders anything.
 */
import { createNamespaceTranslations } from '@/lib/namespace-translations';
import englishDesign from '@/locales/en/design.json';
import romanianDesign from '@/locales/ro/design.json';

const designTranslations = createNamespaceTranslations('design', romanianDesign, englishDesign);

/**
 * Registers the design texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export const registerDesignTranslations = designTranslations.register;
