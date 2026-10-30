/**
 * MailThreadPage: /moderator-mail/:reference, one thread with the moderation team (story
 * S1-E10-11).
 *
 * The messages, then a box to answer; answering a closed thread opens it again. The member never
 * sees internal notes or which person on the team wrote. A reference that isn't theirs reads as
 * "not found".
 * Who shows it: the router; a moderator_mail_reply notification links here.
 * What it calls: useMyMailThread.
 */
import { Link, useParams } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import { useMyMailThread } from '../hooks/useMyMail';
import { useMailTranslation } from '../registerMailTranslations';

import { MailMessages } from './MailMessages';
import { MailReplyForm } from './MailReplyForm';

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
    <div className="flex max-w-[760px] flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="m-0 font-heading text-[clamp(28px,3.4vw,40px)] leading-[1.05] font-bold break-words text-heading">
          {thread.subject}
        </h1>
        <p className="m-0 text-sm text-meta">
          {t('thread.meta', {
            reference: thread.reference,
            status: t(`statuses.${thread.status}`),
          })}
          {thread.statementReference !== null &&
            ` · ${t('thread.decision', { reference: thread.statementReference })}`}
        </p>
      </div>
      <MailMessages messages={thread.messages} />
      <MailReplyForm
        id="mail-reply"
        label={t('thread.replyLabel')}
        isBusy={state.isReplying}
        failure={state.failure}
        waitMinutes={state.waitMinutes}
        onSend={(body) => state.reply(body)}
      />
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
    <PageContainer className="flex flex-col gap-6 pt-14 pb-16">
      <title>{t('thread.documentTitle', { reference })}</title>
      <Eyebrow>{t('eyebrow')}</Eyebrow>
      <ThreadBody state={state} />
      <Link to="/moderator-mail" className="w-fit text-sm font-semibold text-link underline">
        {t('back')}
      </Link>
    </PageContainer>
  );
}
