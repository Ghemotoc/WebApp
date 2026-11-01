/**
 * OnlineDot: the small dot by someone's name while they are online (story S1-E13-01; board 6.3:
 * "people you follow see a small dot by your name").
 *
 * The dot is decorative; the word "Online" sits beside it for screen readers, and as a tooltip,
 * so the state is never told by colour alone (WCAG 1.4.1). It is drawn only when the database
 * says this person shows as online to the reader (who_is_online()).
 * Who uses it: ProfileHeader, ChatHeader and ChatListItem.
 */
import { usePrivacyTranslation } from '../registerPrivacyTranslations';

/**
 * Renders the dot, or nothing when the person isn't online for this reader.
 *
 * @param props.isOnline - from useOnlineHandles
 * @returns the dot with its hidden word, or null
 */
export function OnlineDot({ isOnline }: { isOnline: boolean }) {
  const { t } = usePrivacyTranslation();
  if (!isOnline) return null;
  return (
    <span className="inline-flex items-center" title={t('online.dot')}>
      <span aria-hidden="true" className="size-2.5 rounded-full bg-(--success-text)" />
      <span className="sr-only">{t('online.dot')}</span>
    </span>
  );
}
