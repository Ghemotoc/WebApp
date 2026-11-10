/**
 * Adds the chapter editor's texts (the "editor" namespace) to the translations when an editor
 * component first renders (stories S1-E3-02, S1-E3-09 to S1-E3-11; split out by bundle GAPS-6).
 *
 * Why not with the rest: only a writer in the chapter editor reads these texts, but they used to
 * travel with every first page, the chapter reader included, and took its cold download over its
 * script budget (e2e/reader-performance.spec.ts, QA-6 finding S4). The editor loads in its own
 * file, so its texts now travel with it. Same pattern as the library and discovery texts.
 * Who calls it: every component in src/features/writing/components that shows editor text,
 * through useEditorTranslation().
 */
import { createNamespaceTranslations } from '@/lib/namespace-translations';
import englishEditor from '@/locales/en/editor.json';
import romanianEditor from '@/locales/ro/editor.json';

const editorTranslations = createNamespaceTranslations('editor', romanianEditor, englishEditor);

/**
 * Registers the editor texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export const registerEditorTranslations = editorTranslations.register;

/**
 * useTranslation('editor'), after making sure the editor texts are registered.
 *
 * @returns what useTranslation('editor') returns: t and the i18n instance
 */
export const useEditorTranslation = editorTranslations.useNamespaceTranslation;
