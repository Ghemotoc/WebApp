/**
 * One helper for a feature's own translation file (a "namespace" such as "comments"), so the 35
 * feature folders don't each repeat the same register-and-hook code (QA-5, finding R3).
 *
 * Why features load their text separately: each feature's text arrives with its own code, so the
 * reader and the home page don't download the text of screens they never show (S1-E4-01b, the
 * reader's script budget; architecture 1.8.1, the staff chunk).
 * Who calls it: every src/features/<feature>/register<Feature>Translations.ts file.
 * What it calls next: i18next's addResourceBundle, and react-i18next's useTranslation.
 * Staff overrides of interface text (S1-E11-18) are laid on top later by src/lib/i18n.ts; this
 * helper only adds the file text, which stays the default.
 */
import type { i18n as I18nInstance, ResourceKey } from 'i18next';
import { useTranslation } from 'react-i18next';

/** The two things a feature needs for its text: a one-time register and a hook. */
export type NamespaceTranslations<Namespace extends string> = {
  /** Adds the feature's ro and en text to an i18n instance once; calling it again does nothing. */
  register: (i18n: I18nInstance) => void;
  /** useTranslation(namespace), after making sure the text is registered. */
  useNamespaceTranslation: () => ReturnType<typeof useTranslation<Namespace>>;
};

/**
 * Builds the register function and the hook for one namespace.
 *
 * @param namespace - the namespace name, the same as the locale file name ("comments" for
 *   src/locales/ro/comments.json)
 * @param romanianText - the parsed src/locales/ro/<namespace>.json
 * @param englishText - the parsed src/locales/en/<namespace>.json
 * @returns register and useNamespaceTranslation, which the feature re-exports under its own names
 */
export function createNamespaceTranslations<Namespace extends string>(
  namespace: Namespace,
  romanianText: ResourceKey,
  englishText: ResourceKey,
): NamespaceTranslations<Namespace> {
  function register(i18n: I18nInstance): void {
    // Step 1: once the Romanian text is in, both languages are, so there is nothing to do.
    if (i18n.hasResourceBundle('ro', namespace)) return;
    // Step 2: add the file text for both languages.
    i18n.addResourceBundle('ro', namespace, romanianText);
    i18n.addResourceBundle('en', namespace, englishText);
  }

  function useNamespaceTranslation() {
    // Step 1: the instance this component renders with (the app's, or a test's).
    const { i18n } = useTranslation();
    // Step 2: add the feature's text to it the first time any of its components renders.
    register(i18n);
    // Step 3: hand back the usual translation helpers for this namespace.
    return useTranslation(namespace);
  }

  return { register, useNamespaceTranslation };
}
