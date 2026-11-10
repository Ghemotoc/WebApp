/**
 * CallsSection: "Calls for submissions" on the Writers' hub staff page: the list with closed
 * calls, adding, changing and deleting (bundle GAPS-12d). Every change is in the audit log.
 *
 * Who shows it: StaffHubPage. What it calls: useStaffCalls, CallForm and CallItem.
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Notice } from '@/components/ui/Notice';

import type { CallDraft } from '../../api/hubCalls';
import { useStaffCalls } from '../../hooks/useStaffCalls';
import { useHubTranslation } from '../../registerHubTranslations';

import { CallForm } from './CallForm';
import { CallItem } from './CallItem';

/** An empty draft for a new call. */
const newDraft: CallDraft = {
  id: null,
  titleRo: '',
  titleEn: '',
  detailsRo: '',
  detailsEn: '',
  linkUrl: 'https://',
  closesOn: '',
  isPaid: false,
};

type CallsState = ReturnType<typeof useStaffCalls>;

/**
 * The list, a wait, or why there is none.
 *
 * @returns the list part
 */
function CallList({
  state,
  editingId,
  setEditingId,
}: {
  state: CallsState;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
}) {
  const { t } = useHubTranslation();
  if (state.calls.isError) return <Notice tone="error">{t('hubStaff.loadFailed')}</Notice>;
  if (state.calls.data === undefined)
    return <p className="m-0 text-meta">{t('hubStaff.loading')}</p>;
  if (state.calls.data.length === 0)
    return <p className="m-0 text-body">{t('hubStaff.calls.empty')}</p>;
  return (
    <ul
      className="m-0 flex list-none flex-col gap-3 p-0"
      aria-label={t('hubStaff.calls.listLabel')}
    >
      {state.calls.data.map((call) => (
        <CallItem
          key={call.id}
          call={call}
          state={state}
          isEditing={editingId === call.id}
          onEdit={() => setEditingId(call.id)}
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
export function CallsSection() {
  const { t } = useHubTranslation();
  const state = useStaffCalls();
  // Which call is open for changing: its ID, "new" for the add form, or null.
  const [editingId, setEditingId] = useState<string | null>(null);
  // A refused value gets this section's own words; the other refusals are shared.
  const failureKey =
    state.changeFailure === 'refused'
      ? 'hubStaff.calls.refused'
      : `hubStaff.failures.${state.changeFailure ?? 'failed'}`;
  return (
    <section aria-labelledby="staff-hub-calls" className="flex max-w-[720px] flex-col gap-4">
      <h2 id="staff-hub-calls" className="m-0 font-heading text-2xl font-bold text-heading">
        {t('hubStaff.calls.heading')}
      </h2>
      <p className="m-0 text-body">{t('hubStaff.calls.intro')}</p>
      <div aria-live="polite">
        {state.changeFailure !== null && <Notice tone="error">{t(failureKey)}</Notice>}
      </div>
      {editingId === 'new' ? (
        <Card className="flex flex-col gap-3 p-5">
          <CallForm
            initial={newDraft}
            isBusy={state.isChanging}
            onSave={async (draft) => state.save.mutateAsync(draft).then(() => setEditingId(null))}
            onCancel={() => setEditingId(null)}
          />
        </Card>
      ) : (
        <Button className="w-fit" onClick={() => setEditingId('new')}>
          {t('hubStaff.calls.add')}
        </Button>
      )}
      <CallList state={state} editingId={editingId} setEditingId={setEditingId} />
    </section>
  );
}
