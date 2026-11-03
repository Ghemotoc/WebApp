/**
 * CannedRepliesPage: /staff/support/canned, the list of canned replies support staff insert into
 * tickets, with adding, changing and deleting (story S1-E11-13, part 13b; bundle ADMIN-2h3b;
 * criterion 8). Every change is in the audit log with the before and after words. Plain
 * components, no doodles (staff screens).
 *
 * Who shows it: the router, inside StaffLayout. What it calls: useCannedReplies and
 * CannedReplyForm and CannedReplyItem.
 */
import { useState } from 'react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import type { CannedReplyDraft } from '../api/cannedReplies';
import { useCannedReplies } from '../hooks/useCannedReplies';
import { placeholderWords } from '../lib/fillCannedReply';
import { useSupportTranslation } from '../registerSupportTranslations';

import { CannedReplyForm } from './CannedReplyForm';
import { CannedReplyItem } from './CannedReplyItem';

/** An empty draft for a new reply. */
const newDraft: CannedReplyDraft = { id: null, title: '', bodyRo: '', bodyEn: '' };

type CannedState = ReturnType<typeof useCannedReplies>;

/**
 * The list, a wait, or why there is none.
 *
 * @returns the list part
 */
function CannedList({
  state,
  editingId,
  setEditingId,
}: {
  state: CannedState;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
}) {
  const { t } = useSupportTranslation();
  if (state.loadFailure === 'not_allowed')
    return <p className="m-0 text-body">{t('staff.notAllowed')}</p>;
  if (state.loadFailure !== null) return <Notice tone="error">{t('staff.loadFailed')}</Notice>;
  if (state.replies.data === undefined)
    return <p className="m-0 text-meta">{t('staff.loading')}</p>;
  if (state.replies.data.length === 0)
    return <p className="m-0 text-body">{t('staff.canned.empty')}</p>;
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0" aria-label={t('staff.canned.listLabel')}>
      {state.replies.data.map((reply) => (
        <CannedReplyItem
          key={reply.id}
          reply={reply}
          state={state}
          isEditing={editingId === reply.id}
          onEdit={() => setEditingId(reply.id)}
          onDone={() => setEditingId(null)}
        />
      ))}
    </ul>
  );
}

/**
 * Renders the page.
 *
 * @returns the screen
 */
export function CannedRepliesPage() {
  const { t } = useSupportTranslation();
  const state = useCannedReplies();
  // Which reply is open for changing: its ID, "new" for the add form, or null.
  const [editingId, setEditingId] = useState<string | null>(null);
  return (
    <PageContainer className="flex flex-col gap-6 pt-12 pb-7">
      <title>{t('staff.canned.documentTitle')}</title>
      <div className="flex max-w-[720px] flex-col gap-2">
        <Eyebrow>{t('staff.eyebrow')}</Eyebrow>
        <h1 className="m-0 font-heading text-[34px] font-bold text-heading">
          {t('staff.canned.heading')}
        </h1>
        <p className="m-0 text-body">{t('staff.canned.intro', placeholderWords)}</p>
      </div>
      <div aria-live="polite">
        {state.changeFailure !== null && (
          <Notice tone="error">{t(`failures.${state.changeFailure}`, { minutes: 60 })}</Notice>
        )}
      </div>
      {editingId === 'new' ? (
        <Card className="flex max-w-[720px] flex-col gap-3 p-5">
          <CannedReplyForm
            initial={newDraft}
            isBusy={state.isChanging}
            onSave={async (draft) => state.save.mutateAsync(draft).then(() => setEditingId(null))}
            onCancel={() => setEditingId(null)}
          />
        </Card>
      ) : (
        <Button className="w-fit" onClick={() => setEditingId('new')}>
          {t('staff.canned.add')}
        </Button>
      )}
      <CannedList state={state} editingId={editingId} setEditingId={setEditingId} />
      <Link to="/staff/support" className="w-fit text-sm font-semibold text-link underline">
        {t('staff.canned.back')}
      </Link>
    </PageContainer>
  );
}
