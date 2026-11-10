/**
 * PromptForm: adds a writing prompt or changes one: the words in English and Romanian and the
 * first of its 7 days (bundle GAPS-12c). English comes first: it is the main language (Robert,
 * 10 Nov 2026).
 *
 * Who shows it: PromptsSection and PromptItem. What it calls: the onSave and onCancel it is given.
 */
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { Textarea } from '@/components/ui/Textarea';
import { errorShownByHook } from '@/lib/errorShownByHook';

import { promptLimit, type PromptDraft } from '../../api/hubPrompts';
import { useHubTranslation } from '../../registerHubTranslations';

/** What the form needs. */
export interface PromptFormProps {
  /** The prompt to change, or a draft with id null for a new one. */
  initial: PromptDraft;
  isBusy: boolean;
  onSave: (draft: PromptDraft) => Promise<unknown>;
  onCancel: () => void;
}

/**
 * Renders the form; Save stays off until both texts and the day are filled in.
 *
 * @returns the form
 */
export function PromptForm({ initial, isBusy, onSave, onCancel }: PromptFormProps) {
  const { t } = useHubTranslation();
  const [draft, setDraft] = useState<PromptDraft>(initial);
  const isComplete = [draft.promptEn, draft.promptRo, draft.startsOn].every(
    (field) => field.trim() !== '',
  );
  const idPrefix = `prompt-${initial.id ?? 'new'}`;

  /** Saves the draft; the page closes the form once it is saved and shows why when it isn't. */
  function submit(event: FormEvent) {
    event.preventDefault();
    if (isComplete) void onSave(draft).catch(errorShownByHook);
  }

  return (
    <form noValidate className="flex flex-col gap-4" onSubmit={submit}>
      <Textarea
        id={`${idPrefix}-en`}
        label={t('hubStaff.prompts.enLabel')}
        lang="en"
        rows={3}
        maxLength={promptLimit}
        value={draft.promptEn}
        onChange={(event) => setDraft({ ...draft, promptEn: event.target.value })}
      />
      <Textarea
        id={`${idPrefix}-ro`}
        label={t('hubStaff.prompts.roLabel')}
        lang="ro"
        rows={3}
        maxLength={promptLimit}
        value={draft.promptRo}
        onChange={(event) => setDraft({ ...draft, promptRo: event.target.value })}
      />
      <TextInput
        id={`${idPrefix}-day`}
        type="date"
        label={t('hubStaff.prompts.dayLabel')}
        hint={t('hubStaff.prompts.dayHint')}
        value={draft.startsOn}
        onChange={(event) => setDraft({ ...draft, startsOn: event.target.value })}
      />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isBusy || !isComplete}>
          {t('hubStaff.save')}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          {t('hubStaff.cancel')}
        </Button>
      </div>
    </form>
  );
}
