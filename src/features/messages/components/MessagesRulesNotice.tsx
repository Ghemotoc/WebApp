/**
 * MessagesRulesNotice: the plum box over the Chats list that says who may message the person
 * (stories S1-E9-01 and S1-E9-03; board Messages 5.5).
 *
 * Under-18s also read the age rule ("Adults can never message anyone under 16…"); everyone reads
 * their own setting ("Right now, only people you follow can message you."). It shows only the
 * person's own age group, never anyone else's. "Change" opens Settings › Messages (S1-E9-04).
 * Who shows it: ChatList. What it calls: useMyMessageSettings.
 */
import shieldIcon from '@/assets/icons/shield.svg';

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
  const isUnder18 = settings.data.ageGroup !== 'adult';
  return (
    <div className="flex gap-3 rounded-card border border-border bg-tint p-4 text-sm leading-relaxed text-ink">
      <img
        src={shieldIcon}
        alt=""
        aria-hidden="true"
        width={22}
        height={22}
        className="mt-0.5 size-[22px] flex-none"
      />
      <div className="flex flex-col gap-1">
        <p className="m-0">
          {isUnder18 && <strong className="font-semibold">{t('rules.minors')} </strong>}
          {t(`rules.audience.${settings.data.audience}`)}
        </p>
        <MessageSettingsLink text={t('settings.change')} label={t('settings.changeWho')} />
      </div>
    </div>
  );
}
