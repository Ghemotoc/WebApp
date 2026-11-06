/**
 * Adds the sharing texts (the "sharing" namespace) to the translations when a share dialog or
 * the quote card first opens (stories S1-E4-05 and S1-E4-07).
 *
 * Why not with the rest: the Share button, the Share quote bar and the dialogs are all fetched
 * only when needed, so their texts travel with them and stay out of the chapter reader's 40 KB
 * script budget (e2e/reader-performance.spec.ts).
 * Who calls it: ShareButton, QuoteShareBar, LoadedShareDialog and LoadedQuoteDialog, before they
 * render anything.
 */
import { createNamespaceTranslations } from '@/lib/namespace-translations';
import englishSharing from '@/locales/en/sharing.json';
import romanianSharing from '@/locales/ro/sharing.json';

const sharingTranslations = createNamespaceTranslations('sharing', romanianSharing, englishSharing);

/**
 * Registers the sharing texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export const registerSharingTranslations = sharingTranslations.register;
