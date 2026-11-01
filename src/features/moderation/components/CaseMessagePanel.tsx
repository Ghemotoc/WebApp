/**
 * CaseMessagePanel: the private message a case is about, with up to the 20 messages before it
 * (story S1-E9-02 criterion 2; board Messages 5.5).
 *
 * The messages are listed oldest first, each with who wrote it and when; the reported one is
 * marked in words ("Reported"), not by colour alone. Words are plain text, never HTML or
 * Markdown. Opening the case reads private messages, so the database logs it as a sensitive read
 * (architecture 1.8.3) and the panel says so. The decision is the usual one: removing the item
 * takes away this one message and leaves the chat.
 * Plain components, no doodles (DoD: staff screens).
 * Who shows it: CasePage, when the case is about a message. What it calls: useCaseMessage.
 */
import { useTranslation } from 'react-i18next';

import { Notice } from '@/components/ui/Notice';

import type { CaseChatMessage } from '../api/caseMessage';
import { useCaseMessage } from '../hooks/useCaseMessage';

/** The date and time a message was sent. */
function sentAtText(iso: string, language: string): string {
  return new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso),
  );
}

/**
 * One message in the list.
 *
 * @returns a list item
 */
function CaseChatLine({ message }: { message: CaseChatMessage }) {
  const { t, i18n } = useTranslation('moderation');
  // The reported message stands out with a border and the word "Reported".
  const lineStyle = message.isReported
    ? 'border-2 border-destructive bg-surface'
    : 'border border-border bg-paper';
  return (
    <li className={`flex flex-col gap-1 rounded-card p-3 ${lineStyle}`}>
      <p className="m-0 flex flex-wrap items-center gap-2 text-sm text-meta">
        <span className="font-semibold text-heading">@{message.fromHandle}</span>
        <span>{sentAtText(message.sentAt, i18n.language)}</span>
        {message.isReported && (
          <span className="font-semibold text-destructive">{t('message.reported')}</span>
        )}
      </p>
      <p className="m-0 break-words whitespace-pre-line text-body">{message.text}</p>
    </li>
  );
}

/**
 * Renders the panel.
 *
 * @param props.caseId - the case's ID
 * @returns the panel, or null while loading or when the case isn't about a message
 */
export function CaseMessagePanel({ caseId }: { caseId: string }) {
  const { t } = useTranslation('moderation');
  const query = useCaseMessage(caseId);
  if (query.isError) return <Notice tone="error">{t('message.loadFailed')}</Notice>;
  const chat = query.data;
  if (chat === undefined || chat === null) return null;
  return (
    <section
      aria-labelledby="case-message-heading"
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5"
    >
      <h2 id="case-message-heading" className="m-0 font-heading text-lg font-bold text-heading">
        {t('message.heading')}
      </h2>
      {chat.between.length === 2 && (
        <p className="m-0 text-body">
          {t('message.between', { first: chat.between[0], second: chat.between[1] })}
        </p>
      )}
      {chat.messages.length === 0 ? (
        <p className="m-0 text-body">{t('message.gone')}</p>
      ) : (
        <ol aria-label={t('message.listLabel')} className="m-0 flex list-none flex-col gap-2 p-0">
          {chat.messages.map((message) => (
            <CaseChatLine key={message.id} message={message} />
          ))}
        </ol>
      )}
      <p className="m-0 text-[13px] text-meta">{t('message.loggedHint')}</p>
      <p className="m-0 text-[13px] text-meta">{t('message.decisionHint')}</p>
    </section>
  );
}
