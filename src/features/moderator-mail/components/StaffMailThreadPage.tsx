/**
 * StaffMailThreadPage: /staff/moderator-mail/:reference, one thread for the moderation team
 * (story S1-E10-11; criterion 2).
 *
 * The messages with their writers and internal notes; assign (a username, or empty for nobody);
 * the status; and a box to answer as "The moderation team" or to add an internal note the member
 * never sees. Every step is in the audit log, without the words. Plain components, no doodles.
 * Who shows it: the router, inside StaffLayout. What it calls: useStaffThread.
 */
import { useState } from 'react';
import { Link, useParams } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { Select } from '@/components/ui/Select';
import { TextInput } from '@/components/ui/TextInput';

import type { MailStatus, MailThread } from '../api/moderatorMail';
import { useStaffThread } from '../hooks/useStaffMail';
import { useMailTranslation } from '../registerMailTranslations';

import { MailMessages } from './MailMessages';
import { MailReplyForm } from './MailReplyForm';
import { errorShownByHook } from '@/lib/errorShownByHook';

/**
 * Assign and status, side by side.
 *
 * @returns the controls
 */
function ThreadControls({
  thread,
  state,
}: {
  thread: MailThread;
  state: ReturnType<typeof useStaffThread>;
}) {
  const { t } = useMailTranslation();
  const [assignee, setAssignee] = useState(thread.assignedHandle ?? '');
  return (
    <div className="flex flex-wrap items-end gap-4 rounded-card border border-border bg-surface p-5">
      <div className="flex flex-wrap items-end gap-3">
        <TextInput
          id="mail-assignee"
          label={t('staff.assignLabel')}
          hint={t('staff.assignHint')}
          value={assignee}
          onChange={(event) => setAssignee(event.target.value)}
        />
        <Button
          variant="secondary"
          disabled={state.isChanging}
          onClick={() =>
            void state.change({ kind: 'assign', handle: assignee.trim() }).catch(errorShownByHook)
          }
        >
          {t('staff.assign')}
        </Button>
      </div>
      <Select
        id="mail-thread-status"
        label={t('staff.status')}
        isLabelVisible
        value={thread.status}
        onChange={(value) =>
          void state.change({ kind: 'status', status: value as MailStatus }).catch(errorShownByHook)
        }
        options={[
          { value: 'open', label: t('statuses.open') },
          { value: 'waiting', label: t('statuses.waiting') },
          { value: 'closed', label: t('statuses.closed') },
        ]}
      />
    </div>
  );
}

/**
 * The thread, once loaded.
 *
 * @returns the page's body
 */
function StaffThreadBody({ state }: { state: ReturnType<typeof useStaffThread> }) {
  const { t } = useMailTranslation();
  if (state.loadFailure === 'not_allowed')
    return <p className="m-0 text-body">{t('staff.notAllowed')}</p>;
  if (state.thread.isError) return <Notice tone="error">{t('staff.loadFailed')}</Notice>;
  if (state.thread.isPending) return null;
  const thread = state.thread.data;
  if (thread === null) return <p className="m-0 text-body">{t('thread.notFound')}</p>;
  return (
    <div className="flex max-w-[860px] flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="m-0 font-heading text-[30px] font-bold break-words text-heading">
          {thread.subject}
        </h1>
        <p className="m-0 text-sm text-meta">
          {t('staff.threadMeta', {
            reference: thread.reference,
            handle: thread.memberHandle ?? '',
          })}
          {thread.statementReference !== null &&
            ` · ${t('thread.decision', { reference: thread.statementReference })}`}
        </p>
      </div>
      <ThreadControls
        key={`${thread.assignedHandle ?? ''}-${thread.status}`}
        thread={thread}
        state={state}
      />
      <MailMessages messages={thread.messages} isStaffView />
      <MailReplyForm
        id="staff-mail-reply"
        label={t('staff.replyLabel')}
        isBusy={state.isChanging}
        failure={state.failure}
        waitMinutes={state.waitMinutes}
        allowsNote
        onSend={(body, isNote) => state.change({ kind: 'reply', body, isNote })}
      />
    </div>
  );
}

/**
 * Renders the page.
 *
 * @returns the screen
 */
export function StaffMailThreadPage() {
  const { t } = useMailTranslation();
  const { reference = '' } = useParams();
  const state = useStaffThread(reference);
  return (
    <PageContainer className="flex flex-col gap-6 pt-12 pb-7">
      <title>{t('thread.documentTitle', { reference })}</title>
      <Eyebrow>{t('staff.eyebrow')}</Eyebrow>
      <StaffThreadBody state={state} />
      <Link to="/staff/moderator-mail" className="w-fit text-sm font-semibold text-link underline">
        {t('staff.back')}
      </Link>
    </PageContainer>
  );
}
