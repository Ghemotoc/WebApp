/**
 * MailThreadPage: /moderator-mail/:reference, one thread with the moderation team (story
 * S1-E10-11; board ModMailOne in the liquid glass redesign, bundle G8c).
 *
 * As the board draws it: "Moderator mail" to go back, the reference (and the linked decision) as
 * the eyebrow, the subject as the title with the status pill on the right, the messages as chat
 * bubbles in one glass card, then a glass card to answer with the "Text only" hint beside Send,
 * and the note that answering a closed thread opens it again. The member never sees internal
 * notes or which person on the team wrote. A reference that isn't theirs reads as "not found".
 * Who shows it: the router; a moderator_mail_reply notification links here.
 * What it calls: useMyMailThread, MailMessages, MailReplyForm, MailStatusPill.
 */
import { useParams } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import type { MailThread } from '../api/moderatorMail';
import { useMyMailThread } from '../hooks/useMyMail';
import { useMailTranslation } from '../registerMailTranslations';

import { MailBackLink } from './MailBackLink';
import { MailMessages } from './MailMessages';
import { MailReplyForm } from './MailReplyForm';
import { MailStatusPill } from './MailStatusPill';

/** The glass card the board draws around the messages and around the answer box. */
const glassCard = 'rounded-[28px] border border-border bg-surface p-5 shadow-card md:p-7';

/**
 * The eyebrow, the subject and the status.
 *
 * @returns the header
 */
function ThreadHeader({ thread }: { thread: MailThread }) {
  const { t } = useMailTranslation();
  const eyebrow =
    thread.statementReference === null
      ? thread.reference
      : t('list.referenceLinked', {
          reference: thread.reference,
          decision: thread.statementReference,
        });
  return (
    <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="flex min-w-0 flex-col gap-2">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="m-0 font-heading text-[clamp(28px,3.4vw,40px)] leading-[1.05] font-bold break-words text-heading">
          {thread.subject}
        </h1>
      </div>
      <div className="shrink-0">
        <MailStatusPill status={thread.status} />
      </div>
    </header>
  );
}

/**
 * The thread, once loaded.
 *
 * @returns the thread's body
 */
function ThreadBody({ state }: { state: ReturnType<typeof useMyMailThread> }) {
  const { t } = useMailTranslation();
  if (state.thread.isError) return <Notice tone="error">{t('thread.loadFailed')}</Notice>;
  if (state.thread.isPending) return null;
  const thread = state.thread.data;
  if (thread === null) return <p className="m-0 text-body">{t('thread.notFound')}</p>;
  return (
    <div className="flex max-w-[820px] flex-col gap-6">
      <ThreadHeader thread={thread} />
      <div className={glassCard}>
        <MailMessages messages={thread.messages} />
      </div>
      <div className={glassCard}>
        <MailReplyForm
          id="mail-reply"
          label={t('thread.replyLabel')}
          hint={t('thread.textOnly')}
          isBusy={state.isReplying}
          failure={state.failure}
          waitMinutes={state.waitMinutes}
          onSend={(body) => state.reply(body)}
        />
      </div>
      <p className="m-0 text-sm text-meta">{t('thread.reopens')}</p>
    </div>
  );
}

/**
 * Renders the page.
 *
 * @returns the screen
 */
export function MailThreadPage() {
  const { t } = useMailTranslation();
  const { reference = '' } = useParams();
  const state = useMyMailThread(reference);
  return (
    <PageContainer className="flex flex-col gap-6 pt-10 pb-16">
      <title>{t('thread.documentTitle', { reference })}</title>
      <MailBackLink to="/moderator-mail" label={t('back')} />
      <ThreadBody state={state} />
    </PageContainer>
  );
}
