/**
 * MessagesRulesNotice: the box over the chats that says, in words, who may message the person
 * (stories S1-E9-01 and S1-E9-03; user story 4.2, "The rules sit above the list in words";
 * board E12-Messages).
 *
 * As the board draws it: the information colours, 12 px corners, the age rule ("Adults can never
 * message anyone under 16…") and the person's own setting ("Right now, only people you follow can
 * message you.") in one paragraph, then "Change" to Settings › Messages (S1-E9-04). The age rule
 * is the same for everyone, so everyone reads it; the setting is the person's own, never anyone
 * else's.
 * Who shows it: ChatList. What it calls: useMyMessageSettings.
 */
import { useMyMessageSettings } from '../hooks/useMessages';
import { useMessagesTranslation } from '../registerMessagesTranslations';

import { MessageSettingsLink } from './MessageSettingsLink';

/**
 * Renders the notice once the setting is known.
 *
 * @returns the notice, or nothing while loading or when it can't be read
 */
export function MessagesRulesNotice() {
  const { t } = useMessagesTranslation();
  const settings = useMyMessageSettings();
  if (settings.data === undefined) return null;
  return (
    <div className="flex flex-col gap-1 rounded-field border border-(--info-border) bg-(--info-bg) p-4 text-(--info-text)">
      <p className="m-0 type-body">
        {t('rules.minors')} {t(`rules.audience.${settings.data.audience}`)}
      </p>
      <MessageSettingsLink text={t('settings.change')} label={t('settings.changeWho')} />
    </div>
  );
}
