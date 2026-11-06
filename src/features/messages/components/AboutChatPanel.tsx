/**
 * AboutChatPanel: the right-hand column of a chat: the person's profile, whether you follow each
 * other, who may message you, messages from adults (16 and 17-year-olds only) and who can read
 * messages (story S1-E9-01; board Messages 5.5, "About this chat").
 *
 * It shows only the reader's own setting and age group, never the other person's, each with
 * "Change" to Settings › Messages, and Delete chat (S1-E9-04). Label rows have a fine line
 * between them (DoD, design rules).
 * Who shows it: MessagesPage. What it calls: useMyMessageSettings and DeleteChatControl.
 */
import { Link } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';

import type { Conversation } from '../api/messages';
import { useMyMessageSettings } from '../hooks/useMessages';
import { useMessagesTranslation } from '../registerMessagesTranslations';

import { DeleteChatControl } from './DeleteChatControl';
import { MessageSettingsLink } from './MessageSettingsLink';

/** "You follow each other", or which way round, or neither. */
function followLineKey(chat: Conversation): string {
  if (chat.iFollow && chat.theyFollow) return 'about.followEachOther';
  if (chat.iFollow) return 'about.iFollow';
  if (chat.theyFollow) return 'about.theyFollow';
  return 'about.noFollow';
}

/** The reader's own setting and, for 16 and 17-year-olds, messages from adults. */
function MySettingRows() {
  const { t } = useMessagesTranslation();
  const settings = useMyMessageSettings();
  if (settings.data === undefined) return null;
  return (
    <>
      <div className="flex flex-col gap-1 border-b border-border py-3">
        <Eyebrow>{t('about.whoTitle')}</Eyebrow>
        <p className="m-0 font-semibold text-heading">
          {t(`about.audience.${settings.data.audience}`)}
        </p>
        <MessageSettingsLink text={t('settings.change')} label={t('settings.changeWho')} />
      </div>
      {settings.data.ageGroup === 'teen' && (
        <div className="flex flex-col gap-1 border-b border-border py-3">
          <Eyebrow>{t('about.adultsTitle')}</Eyebrow>
          <p className="m-0 font-semibold text-heading">
            {t(settings.data.adultsMayMessage ? 'about.on' : 'about.off')}
          </p>
          <p className="m-0 text-sm text-body">{t('about.adultsHint')}</p>
          <MessageSettingsLink text={t('settings.change')} label={t('settings.changeAdults')} />
        </div>
      )}
    </>
  );
}

/**
 * Renders the column.
 *
 * @returns the aside
 */
export function AboutChatPanel({ chat }: { chat: Conversation }) {
  const { t } = useMessagesTranslation();
  return (
    <aside aria-labelledby="about-chat-heading" className="flex min-w-0 flex-col p-4 text-sm">
      <div className="flex flex-col gap-1 border-b border-border pb-3">
        <h2 id="about-chat-heading" className="m-0 eyebrow">
          {t('about.title')}
        </h2>
        <Link to={`/u/${chat.handle}`} className="w-fit font-semibold text-link underline">
          {t('about.viewProfile', { name: chat.displayName })}
        </Link>
        <p className="m-0 text-body">{t(followLineKey(chat))}</p>
      </div>
      <MySettingRows />
      {chat.status !== null && !chat.isRequestToMe && <DeleteChatControl handle={chat.handle} />}
      <div className="mt-4 flex flex-col gap-1 rounded-card bg-panel p-4">
        <h3 className="m-0 text-sm font-semibold text-heading">{t('about.privacyTitle')}</h3>
        <p className="m-0 text-body">{t('about.privacy')}</p>
      </div>
    </aside>
  );
}
