/**
 * SessionsSection: "Live sessions" on the Writers' hub staff page: the list with past sessions,
 * adding, changing and deleting (bundle GAPS-12h). Every change is in the audit log.
 *
 * Who shows it: StaffHubPage. What it calls: useStaffSessions, SessionForm and SessionItem.
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Notice } from '@/components/ui/Notice';

import type { SessionDraft } from '../../api/hubSessions';
import { useStaffSessions } from '../../hooks/useStaffSessions';
import { useHubTranslation } from '../../registerHubTranslations';

import { SessionForm } from './SessionForm';
import { SessionItem } from './SessionItem';

/** An empty draft for a new session. */
const newDraft: SessionDraft = {
  id: null,
  titleRo: '',
  titleEn: '',
  startsAt: '',
  languageCode: 'en',
  rating: 'all_ages',
  placeRo: '',
  placeEn: '',
  linkUrl: '',
};

type SessionsState = ReturnType<typeof useStaffSessions>;

/**
 * The list, a wait, or why there is none.
 *
 * @returns the list part
 */
function SessionList({
  state,
  editingId,
  setEditingId,
}: {
  state: SessionsState;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
}) {
  const { t } = useHubTranslation();
  if (state.sessions.isError) return <Notice tone="error">{t('hubStaff.loadFailed')}</Notice>;
  if (state.sessions.data === undefined)
    return <p className="m-0 text-meta">{t('hubStaff.loading')}</p>;
  if (state.sessions.data.length === 0)
    return <p className="m-0 text-body">{t('hubStaff.sessions.empty')}</p>;
  return (
    <ul
      className="m-0 flex list-none flex-col gap-3 p-0"
      aria-label={t('hubStaff.sessions.listLabel')}
    >
      {state.sessions.data.map((session) => (
        <SessionItem
          key={session.id}
          session={session}
          state={state}
          isEditing={editingId === session.id}
          onEdit={() => setEditingId(session.id)}
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
export function SessionsSection() {
  const { t } = useHubTranslation();
  const state = useStaffSessions();
  // Which session is open for changing: its ID, "new" for the add form, or null.
  const [editingId, setEditingId] = useState<string | null>(null);
  // A refused value gets this section's own words; the other refusals are shared.
  const failureKey =
    state.changeFailure === 'refused'
      ? 'hubStaff.sessions.refused'
      : `hubStaff.failures.${state.changeFailure ?? 'failed'}`;
  return (
    <section aria-labelledby="staff-hub-sessions" className="flex max-w-[720px] flex-col gap-4">
      <h2 id="staff-hub-sessions" className="m-0 font-heading text-2xl font-bold text-heading">
        {t('hubStaff.sessions.heading')}
      </h2>
      <p className="m-0 text-body">{t('hubStaff.sessions.intro')}</p>
      <div aria-live="polite">
        {state.changeFailure !== null && <Notice tone="error">{t(failureKey)}</Notice>}
      </div>
      {editingId === 'new' ? (
        <Card className="flex flex-col gap-3 p-5">
          <SessionForm
            initial={newDraft}
            isBusy={state.isChanging}
            onSave={async (draft) => state.save.mutateAsync(draft).then(() => setEditingId(null))}
            onCancel={() => setEditingId(null)}
          />
        </Card>
      ) : (
        <Button className="w-fit" onClick={() => setEditingId('new')}>
          {t('hubStaff.sessions.add')}
        </Button>
      )}
      <SessionList state={state} editingId={editingId} setEditingId={setEditingId} />
    </section>
  );
}
