/**
 * RemoveForumForm: the reason staff give before an empty forum is removed (bundle FORUMS-1,
 * part a). The reason goes to the audit log.
 *
 * Who shows it: ForumAdminRow after Remove. What it calls: the page's act().
 */
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';

import type { ForumAdmin } from '../../hooks/useForumAdmin';

/** What the form needs. */
interface RemoveForumFormProps {
  forumId: string;
  admin: ForumAdmin;
  onClose: () => void;
}

/**
 * The message for what the database refused, if anything.
 *
 * @param problems - the refused fields
 * @returns the locale key, or undefined
 */
function problemKey(problems: { field: string; problem: string }[]): string | undefined {
  const found = problems[0];
  if (found === undefined) return undefined;
  // "reason:empty" → problems.reason_empty; "forum:has_children" → problems.has_children.
  return found.field === 'reason'
    ? `problems.reason_${found.problem}`
    : `problems.${found.problem}`;
}

/**
 * Renders the form.
 *
 * @returns the reason field with Remove the forum and Cancel
 */
export function RemoveForumForm({ forumId, admin, onClose }: RemoveForumFormProps) {
  const { t } = useTranslation('forumsAdmin');
  const [reason, setReason] = useState('');
  const problems = admin.failure?.formKey === forumId ? admin.failure.error.problems : [];
  const errorKey = problemKey(problems);
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const isRemoved = await admin.act({ kind: 'remove', forumId, reason });
    if (isRemoved) onClose();
  };
  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-3">
      <Textarea
        id={`forum-${forumId}-reason`}
        label={t('reason')}
        hint={t('reasonHint')}
        rows={2}
        maxLength={300}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
      {errorKey !== undefined && <p className="m-0 text-sm text-destructive">{t(errorKey)}</p>}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant="destructive" disabled={admin.isBusy}>
          {t('confirmRemove')}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>
          {t('cancel')}
        </Button>
      </div>
    </form>
  );
}
