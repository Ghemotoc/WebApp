/**
 * SessionItem: one live session on the staff page: when it starts (on this device's clock), its
 * language and age group, its English title, the place and the link, with Edit and Delete, or
 * the form while it is being changed (bundle GAPS-12h).
 *
 * Who shows it: SessionsSection. What it calls: the useStaffSessions state it is given.
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { InfoPill } from '@/components/ui/InfoPill';
import { dateLocaleFor } from '@/lib/romania-time';

import type { LiveSession } from '../../api/hubSessions';
import type { useStaffSessions } from '../../hooks/useStaffSessions';
import { useHubTranslation } from '../../registerHubTranslations';

import { ConfirmDeleteButtons } from './ConfirmDeleteButtons';
import { SessionForm } from './SessionForm';

/** What one item needs. */
export interface SessionItemProps {
  session: LiveSession;
  state: ReturnType<typeof useStaffSessions>;
  isEditing: boolean;
  onEdit: () => void;
  onDone: () => void;
}

/**
 * Writes a start in full on this device's clock: "Friday 13 November 2026 at 18:00".
 *
 * @param startsAt - the moment the session starts
 * @param language - the interface language
 * @returns the start's text
 */
function formatStaffStart(startsAt: string, language: string): string {
  return new Intl.DateTimeFormat(dateLocaleFor(language), {
    dateStyle: 'full',
    timeStyle: 'short',
    hour12: false,
  }).format(new Date(startsAt));
}

/**
 * Renders one session.
 *
 * @returns the list item
 */
export function SessionItem({ session, state, isEditing, onEdit, onDone }: SessionItemProps) {
  const { t, i18n } = useHubTranslation();
  // The moment the item was first drawn, read once so drawing it again gives the same answer.
  const [openedAt] = useState(() => Date.now());
  if (isEditing) {
    return (
      <li>
        <Card className="flex flex-col gap-3 p-5">
          <SessionForm
            initial={{ ...session, linkUrl: session.linkUrl ?? '' }}
            isBusy={state.isChanging}
            onSave={async (draft) => state.save.mutateAsync(draft).then(onDone)}
            onCancel={onDone}
          />
        </Card>
      </li>
    );
  }
  // A session that has started no longer shows on the hub; the list keeps it as a record.
  const isPast = new Date(session.startsAt).getTime() <= openedAt;
  return (
    <li>
      <Card className="flex flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="m-0 text-sm text-meta">
            {formatStaffStart(session.startsAt, i18n.language)}
          </p>
          <InfoPill tone="sky">{t(`hub.sessions.language.${session.languageCode}`)}</InfoPill>
          <InfoPill tone="plum">{t(`hub.sessions.rating.${session.rating}`)}</InfoPill>
          {isPast && <InfoPill tone="neutral">{t('hubStaff.sessions.past')}</InfoPill>}
        </div>
        <p lang="en" className="m-0 font-semibold break-words text-heading">
          {session.titleEn}
        </p>
        <p lang="en" className="m-0 text-sm break-words text-body">
          {session.placeEn}
        </p>
        {session.linkUrl !== null && (
          <p className="m-0 text-sm break-all text-meta">{session.linkUrl}</p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            aria-label={t('hubStaff.editNamed', { name: session.titleEn })}
            onClick={onEdit}
          >
            {t('hubStaff.edit')}
          </Button>
          <ConfirmDeleteButtons
            name={session.titleEn}
            isBusy={state.isChanging}
            onDelete={() => state.remove.mutate(session.id)}
          />
        </div>
      </Card>
    </li>
  );
}
