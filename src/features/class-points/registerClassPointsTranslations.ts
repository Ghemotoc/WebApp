/**
 * Adds the class points texts (the "classPoints" namespace) to the translations when a class
 * points component first renders (bundle CLASS-POINTS, part 1; stories S1-E8-13, 14 and 16).
 *
 * Why not with the rest: these screens load in their own files when someone opens a class, so
 * their texts travel with them and the first page stays small (the same pattern as the spaces).
 * Who calls it: every component in src/features/class-points/components, through
 * useClassPointsTranslation().
 */
import { createNamespaceTranslations } from '@/lib/namespace-translations';
import englishClassPoints from '@/locales/en/classPoints.json';
import romanianClassPoints from '@/locales/ro/classPoints.json';

const classPointsTranslations = createNamespaceTranslations(
  'classPoints',
  romanianClassPoints,
  englishClassPoints,
);

/**
 * Registers the class points texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export const registerClassPointsTranslations = classPointsTranslations.register;

/**
 * useTranslation('classPoints'), after making sure the class points texts are registered.
 *
 * @returns what useTranslation('classPoints') returns: t and the i18n instance
 */
export const useClassPointsTranslation = classPointsTranslations.useNamespaceTranslation;
