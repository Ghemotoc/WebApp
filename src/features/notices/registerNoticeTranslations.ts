/**
 * Adds the public report form's text (the "notices" namespace) to the translations when /report
 * first renders (story S1-E10-02).
 *
 * Why not with the rest: the text is only needed on that page, so it travels with it, as the
 * contact and reporting texts do. Who calls it: NoticePage, before it renders anything.
 */
import { createNamespaceTranslations } from '@/lib/namespace-translations';
import englishNotices from '@/locales/en/notices.json';
import romanianNotices from '@/locales/ro/notices.json';

const noticeTranslations = createNamespaceTranslations('notices', romanianNotices, englishNotices);

/**
 * Registers the notice texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export const registerNoticeTranslations = noticeTranslations.register;
