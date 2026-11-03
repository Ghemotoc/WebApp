/**
 * CannedReplyItem: one canned reply on the Canned replies page: its title and English words with
 * Edit and Delete, or the form while it is being changed (story S1-E11-13, part 13b; bundle
 * ADMIN-2h3b). Delete asks once more in place before taking the reply out of the list.
 *
 * Who shows it: CannedRepliesPage. What it calls: the useCannedReplies state it is given.
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

import type { CannedReply } from '../api/cannedReplies';
import type { useCannedReplies } from '../hooks/useCannedReplies';
import { useSupportTranslation } from '../registerSupportTranslations';

import { CannedReplyForm } from './CannedReplyForm';

/** What one item needs. */
export interface CannedReplyItemProps {
  reply: CannedReply;
  state: ReturnType<typeof useCannedReplies>;
  isEditing: boolean;
  onEdit: () => void;
  onDone: () => void;
}

/**
 * The Delete button, then "Delete it" and "Keep it" once pressed, so one slip deletes nothing.
 *
 * @returns the buttons
 */
function DeleteButtons({ reply, state }: Pick<CannedReplyItemProps, 'reply' | 'state'>) {
  const { t } = useSupportTranslation();
  const [isAsking, setIsAsking] = useState(false);
  if (!isAsking) {
    return (
      <Button
        variant="destructive"
        aria-label={t('staff.canned.deleteNamed', { title: reply.title })}
        onClick={() => setIsAsking(true)}
      >
        {t('staff.canned.delete')}
      </Button>
    );
  }
  return (
    <>
      <Button
        variant="destructive"
        disabled={state.isChanging}
        onClick={() => state.remove.mutate(reply.id)}
      >
        {t('staff.canned.deleteConfirm')}
      </Button>
      <Button variant="secondary" onClick={() => setIsAsking(false)}>
        {t('staff.canned.keep')}
      </Button>
    </>
  );
}

/**
 * Renders one reply.
 *
 * @returns the list item
 */
export function CannedReplyItem({ reply, state, isEditing, onEdit, onDone }: CannedReplyItemProps) {
  const { t } = useSupportTranslation();
  if (isEditing) {
    return (
      <li>
        <Card className="flex flex-col gap-3 p-5">
          <CannedReplyForm
            initial={reply}
            isBusy={state.isChanging}
            onSave={async (draft) => state.save.mutateAsync(draft).then(onDone)}
            onCancel={onDone}
          />
        </Card>
      </li>
    );
  }
  return (
    <li>
      <Card className="flex flex-col gap-3 p-5">
        <h2 className="m-0 font-heading text-lg font-bold break-words text-heading">
          {reply.title}
        </h2>
        <p className="m-0 text-sm break-words whitespace-pre-line text-body">{reply.bodyEn}</p>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            aria-label={t('staff.canned.editNamed', { title: reply.title })}
            onClick={onEdit}
          >
            {t('staff.canned.edit')}
          </Button>
          <DeleteButtons reply={reply} state={state} />
        </div>
      </Card>
    </li>
  );
}
