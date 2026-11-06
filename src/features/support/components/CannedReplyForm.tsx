/**
 * CannedReplyForm: adds a canned reply or changes one: a title and the words in Romanian and
 * English (story S1-E11-13, part 13b; bundle ADMIN-2h3b; criterion 8). {{name}} and {{number}}
 * are filled in when staff insert it on a ticket.
 *
 * Who shows it: CannedRepliesPage. What it calls: the onSave and onCancel it is given.
 */
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { Textarea } from '@/components/ui/Textarea';

import { cannedReplyLimits, type CannedReplyDraft } from '../api/cannedReplies';
import { placeholderWords } from '../lib/fillCannedReply';
import { useSupportTranslation } from '../registerSupportTranslations';
import { errorShownByHook } from '@/lib/errorShownByHook';

/** What the form needs. */
export interface CannedReplyFormProps {
  /** The reply to change, or a draft with id null for a new one. */
  initial: CannedReplyDraft;
  isBusy: boolean;
  onSave: (draft: CannedReplyDraft) => Promise<unknown>;
  onCancel: () => void;
}

/**
 * Renders the form; Save stays off until every field has words.
 *
 * @returns the form
 */
export function CannedReplyForm({ initial, isBusy, onSave, onCancel }: CannedReplyFormProps) {
  const { t } = useSupportTranslation();
  const [draft, setDraft] = useState<CannedReplyDraft>(initial);
  const isComplete = [draft.title, draft.bodyRo, draft.bodyEn].every(
    (field) => field.trim() !== '',
  );
  const idPrefix = `canned-${initial.id ?? 'new'}`;

  /** Saves the draft; the page closes the form once it is saved. */
  function submit(event: FormEvent) {
    event.preventDefault();
    if (isComplete) void onSave(draft).catch(errorShownByHook);
  }

  return (
    <form noValidate className="flex flex-col gap-4" onSubmit={submit}>
      <TextInput
        id={`${idPrefix}-title`}
        label={t('staff.canned.titleLabel')}
        maxLength={cannedReplyLimits.title}
        value={draft.title}
        onChange={(event) => setDraft({ ...draft, title: event.target.value })}
      />
      <Textarea
        id={`${idPrefix}-ro`}
        label={t('staff.canned.bodyRoLabel')}
        hint={t('staff.canned.placeholdersHint', placeholderWords)}
        lang="ro"
        rows={6}
        maxLength={cannedReplyLimits.body}
        value={draft.bodyRo}
        onChange={(event) => setDraft({ ...draft, bodyRo: event.target.value })}
      />
      <Textarea
        id={`${idPrefix}-en`}
        label={t('staff.canned.bodyEnLabel')}
        hint={t('staff.canned.placeholdersHint', placeholderWords)}
        lang="en"
        rows={6}
        maxLength={cannedReplyLimits.body}
        value={draft.bodyEn}
        onChange={(event) => setDraft({ ...draft, bodyEn: event.target.value })}
      />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isBusy || !isComplete}>
          {t('staff.canned.save')}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          {t('staff.canned.cancel')}
        </Button>
      </div>
    </form>
  );
}
