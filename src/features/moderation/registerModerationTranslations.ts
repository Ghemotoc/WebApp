/**
 * Adds the moderation screens' text (the "moderation" namespace) to the translations when one of
 * them loads (story S1-E10-03a).
 *
 * Why not with the rest: the admin site is a separate chunk whose code never ships in the
 * reader's bundle (architecture 1.8.1), so its text arrives with it, as the staff namespace does.
 * Who calls it: ModerationQueuePage and CasePage, before they render anything.
 */
import { createNamespaceTranslations } from '@/lib/namespace-translations';
import englishModeration from '@/locales/en/moderation.json';
import romanianModeration from '@/locales/ro/moderation.json';

const moderationTranslations = createNamespaceTranslations(
  'moderation',
  romanianModeration,
  englishModeration,
);

/**
 * Registers the moderation texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export const registerModerationTranslations = moderationTranslations.register;
