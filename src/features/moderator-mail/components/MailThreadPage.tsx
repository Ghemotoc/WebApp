/**
 * MailThreadPage: /moderator-mail/:reference, one thread with the moderation team (story
 * S1-E10-11; board ModMailOne in the liquid glass redesign, bundle G8c; user stories bundle 10, board J24).
 *
 * Board J24: the trail "Settings / Moderator mail / M-000231", the subject as the title with one
 * meta line under it (the state in bold, the reference and the decision it is about), the
 * messages as blocks (the team's tinted), then the answer box straight on the page with the "Text
 * only" hint under it, and the note that answering a closed thread opens it again. The member never sees internal
 * notes or which person on the team wrote. A reference that isn't theirs reads as "not found".
 * Who shows it: the router; a moderator_mail_reply notification links here.
 * What it calls: useMyMailThread, MailMessages, MailReplyForm, MetaLine.
 */
import { useParams } from 'react-router';

import { MetaLine, type MetaFact } from '@/components/ui/MetaLine';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import type { MailThread } from '../api/moderatorMail';
import { useMyMailThread } from '../hooks/useMyMail';
import { useMailTranslation } from '../registerMailTranslations';

import { MailBreadcrumb } from './MailBreadcrumb';
import { MailMessages } from './MailMessages';
import { MailReplyForm } from './MailReplyForm';

/**
 * The subject, with the state, the reference and the decision in one meta line under it.
 *
 * @returns the header
 */
function ThreadHeader({ thread }: { thread: MailThread }) {
  const { t } = useMailTranslation();
  // Step 1: the state first, then the reference.
  const facts: MetaFact[] = [
    { text: t(`statuses.${thread.status}`), kind: 'state' },
    { text: thread.reference },
  ];
  // Step 2: the decision, only for a thread about one.
  if (thread.statementReference !== null) {
    facts.push({ text: t('thread.aboutDecision', { reference: thread.statementReference }) });
  }
  return (
    <header className="flex min-w-0 flex-col gap-2">
      <h1 className="m-0 type-title break-words text-ink-heading lg:type-display">
        {thread.subject}
      </h1>
      <MetaLine facts={facts} />
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
  if (thread === null) return <p className="m-0 text-ink-muted">{t('thread.notFound')}</p>;
  return (
    <div className="flex max-w-[820px] flex-col gap-8">
      <ThreadHeader thread={thread} />
      <MailMessages messages={thread.messages} />
      <div className="flex flex-col gap-3">
        <MailReplyForm
          id="mail-reply"
          label={t('thread.replyLabel')}
          hint={t('thread.textOnly')}
          isBusy={state.isReplying}
          failure={state.failure}
          waitMinutes={state.waitMinutes}
          onSend={(body) => state.reply(body)}
        />
        <p className="m-0 type-meta text-ink-muted">{t('thread.reopens')}</p>
      </div>
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
    <PageContainer className="flex flex-col gap-8 pt-8 pb-16">
      <title>{t('thread.documentTitle', { reference })}</title>
      <MailBreadcrumb current={reference} />
      <ThreadBody state={state} />
    </PageContainer>
  );
}
