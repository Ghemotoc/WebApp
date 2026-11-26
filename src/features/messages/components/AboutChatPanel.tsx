/**
 * AboutChatPanel: "About this chat", beside the chat from 1024 px and under it on phones and
 * tablets (story S1-E9-01; user story 4.3, board E13-Chat).
 *
 * As the board draws it: the subheading, then label rows with a hairline above each (the label
 * at the left, the value at the right): Profile (a link), You (follow each other, or which way
 * round), Who can message you and, for 16 and 17-year-olds only, Messages from adults. Then the
 * privacy line in the meta style and Delete chat as a text button (S1-E9-04). It shows only the
 * reader's own setting and age group, never the other person's; Settings › Messages changes
 * them ("Message settings" under the page title, and Change beside the line that says why the
 * box is gone).
 * Who shows it: ChatPanel. What it calls: useMyMessageSettings and DeleteChatControl.
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import type { Conversation } from '../api/messages';
import { useMyMessageSettings } from '../hooks/useMessages';
import { useMessagesTranslation } from '../registerMessagesTranslations';

import { DeleteChatControl } from './DeleteChatControl';

/** "follow each other", or which way round, or neither. */
function followValueKey(chat: Conversation): string {
  if (chat.iFollow && chat.theyFollow) return 'about.followEachOther';
  if (chat.iFollow) return 'about.iFollow';
  if (chat.theyFollow) return 'about.theyFollow';
  return 'about.noFollow';
}

/**
 * One label row: the label at the left, the value at the right, a hairline above.
 *
 * @returns the row
 */
function AboutRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-t border-hairline py-3">
      <dt className="type-label text-ink-heading">{label}</dt>
      <dd className="m-0 text-right type-body text-ink-muted">{children}</dd>
    </div>
  );
}

/**
 * The reader's own setting and, for 16 and 17-year-olds, messages from adults.
 *
 * @returns the rows, or nothing while the setting loads
 */
function MySettingRows() {
  const { t } = useMessagesTranslation();
  const settings = useMyMessageSettings();
  if (settings.data === undefined) return null;
  return (
    <>
      <AboutRow label={t('about.whoTitle')}>
        {t(`about.audience.${settings.data.audience}`)}
      </AboutRow>
      {settings.data.ageGroup === 'teen' && (
        <AboutRow label={t('about.adultsTitle')}>
          {t(settings.data.adultsMayMessage ? 'about.on' : 'about.off')}
        </AboutRow>
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
    <aside aria-labelledby="about-chat-heading" className="flex min-w-0 flex-col gap-3">
      <h2 id="about-chat-heading" className="m-0 type-subheading">
        {t('about.title')}
      </h2>
      <dl className="m-0">
        <AboutRow label={t('about.profile')}>
          <Link
            to={`/u/${chat.handle}`}
            aria-label={t('about.viewProfile', { name: chat.displayName })}
            className="text-link underline"
          >
            {chat.displayName}
          </Link>
        </AboutRow>
        <AboutRow label={t('about.you')}>{t(followValueKey(chat))}</AboutRow>
        <MySettingRows />
      </dl>
      <p className="m-0 type-meta">{t('about.privacy')}</p>
      {chat.status !== null && !chat.isRequestToMe && (
        <DeleteChatControl handle={chat.handle} name={chat.displayName} />
      )}
    </aside>
  );
}
