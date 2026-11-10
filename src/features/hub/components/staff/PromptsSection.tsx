/**
 * PromptsSection: "Prompt of the week" on the Writers' hub staff page: the list with upcoming
 * prompts, adding, changing and deleting (bundle GAPS-12c). Every change is in the audit log.
 *
 * Who shows it: StaffHubPage. What it calls: useStaffPrompts, PromptForm and PromptItem.
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Notice } from '@/components/ui/Notice';

import type { PromptDraft } from '../../api/hubPrompts';
import { useStaffPrompts } from '../../hooks/useStaffPrompts';
import { useHubTranslation } from '../../registerHubTranslations';

import { PromptForm } from './PromptForm';
import { PromptItem } from './PromptItem';

/** An empty draft for a new prompt. */
const newDraft: PromptDraft = { id: null, promptRo: '', promptEn: '', startsOn: '' };

type PromptsState = ReturnType<typeof useStaffPrompts>;

/**
 * The list, a wait, or why there is none.
 *
 * @returns the list part
 */
function PromptList({
  state,
  editingId,
  setEditingId,
}: {
  state: PromptsState;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
}) {
  const { t } = useHubTranslation();
  if (state.prompts.isError) return <Notice tone="error">{t('hubStaff.loadFailed')}</Notice>;
  if (state.prompts.data === undefined)
    return <p className="m-0 text-meta">{t('hubStaff.loading')}</p>;
  if (state.prompts.data.length === 0)
    return <p className="m-0 text-body">{t('hubStaff.prompts.empty')}</p>;
  return (
    <ul
      className="m-0 flex list-none flex-col gap-3 p-0"
      aria-label={t('hubStaff.prompts.listLabel')}
    >
      {state.prompts.data.map((prompt) => (
        <PromptItem
          key={prompt.id}
          prompt={prompt}
          state={state}
          isEditing={editingId === prompt.id}
          onEdit={() => setEditingId(prompt.id)}
          onDone={() => setEditingId(null)}
        />
      ))}
    </ul>
  );
}

/**
 * Renders the section.
 *
 * @returns the heading, the add form or its button, any refusal and the list
 */
export function PromptsSection() {
  const { t } = useHubTranslation();
  const state = useStaffPrompts();
  // Which prompt is open for changing: its ID, "new" for the add form, or null.
  const [editingId, setEditingId] = useState<string | null>(null);
  // A refused value gets this section's own words; the other refusals are shared.
  const failureKey =
    state.changeFailure === 'refused'
      ? 'hubStaff.prompts.refused'
      : `hubStaff.failures.${state.changeFailure ?? 'failed'}`;
  return (
    <section aria-labelledby="staff-hub-prompts" className="flex max-w-[720px] flex-col gap-4">
      <h2 id="staff-hub-prompts" className="m-0 font-heading text-2xl font-bold text-heading">
        {t('hubStaff.prompts.heading')}
      </h2>
      <p className="m-0 text-body">{t('hubStaff.prompts.intro')}</p>
      <div aria-live="polite">
        {state.changeFailure !== null && <Notice tone="error">{t(failureKey)}</Notice>}
      </div>
      {editingId === 'new' ? (
        <Card className="flex flex-col gap-3 p-5">
          <PromptForm
            initial={newDraft}
            isBusy={state.isChanging}
            onSave={async (draft) => state.save.mutateAsync(draft).then(() => setEditingId(null))}
            onCancel={() => setEditingId(null)}
          />
        </Card>
      ) : (
        <Button className="w-fit" onClick={() => setEditingId('new')}>
          {t('hubStaff.prompts.add')}
        </Button>
      )}
      <PromptList state={state} editingId={editingId} setEditingId={setEditingId} />
    </section>
  );
}
