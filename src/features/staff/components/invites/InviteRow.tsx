/**
 * InviteRow: one invite link on the list, with its Revoke action (story S1-E11-17).
 *
 * Board (AdminUsers, Invites tab): note, uses ("1 of 1"), expiry, status, made by, action. Drawn
 * as label and value rows with a fine line between them (Definition of Done), which read well at
 * every width. Revoking asks for a reason first (the audit log needs one), inline.
 * Who shows it: InviteList. What it calls: the revoke() it is given (useInviteLinks).
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { LabelRows } from '@/components/ui/LabelRows';
import { TextInput } from '@/components/ui/TextInput';

import type { InviteLink } from '../../api/inviteLinks';

import { InviteStatusPill } from './InviteStatusPill';

/** What a row needs. */
interface InviteRowProps {
  link: InviteLink;
  isRevoking: boolean;
  onRevoke: (inviteId: string, reason: string) => Promise<unknown>;
}

/**
 * The reason field and the confirm button, shown after "Revoke" is pressed.
 *
 * @returns the small inline form
 */
function RevokeForm({ link, isRevoking, onRevoke }: InviteRowProps) {
  const { t } = useTranslation('staff');
  const [reason, setReason] = useState('');
  const [problem, setProblem] = useState<string | null>(null);

  /** Needs a reason, then asks the database. */
  async function confirm() {
    if (reason.trim() === '') return setProblem(t('invites.revoke.reasonMissing'));
    setProblem(null);
    await onRevoke(link.id, reason.trim()).catch(() => undefined);
  }

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-3">
      <TextInput
        id={`invite-revoke-reason-${link.id}`}
        label={t('invites.revoke.reason')}
        hint={t('invites.revoke.reasonHint')}
        errorMessage={problem ?? undefined}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
      <div>
        <Button variant="destructive" disabled={isRevoking} onClick={() => void confirm()}>
          {t('invites.revoke.confirm', { note: link.note ?? t('invites.noNote') })}
        </Button>
      </div>
    </div>
  );
}

/**
 * Renders the row.
 *
 * @returns a list item with the link's details and, while active, its Revoke action
 */
export function InviteRow({ link, isRevoking, onRevoke }: InviteRowProps) {
  const { t, i18n } = useTranslation('staff');
  const [isRevokeOpen, setIsRevokeOpen] = useState(false);
  const expires = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(
    new Date(link.expiresAt),
  );
  const note = link.note ?? t('invites.noNote');

  return (
    <li className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
      <LabelRows
        rows={[
          { label: t('invites.columns.note'), value: note },
          {
            label: t('invites.columns.uses'),
            value: t('invites.usesOf', { used: link.useCount, total: link.maxUses }),
          },
          { label: t('invites.columns.expires'), value: expires },
          { label: t('invites.columns.status'), value: <InviteStatusPill status={link.status} /> },
          {
            label: t('invites.columns.madeBy'),
            value: link.madeByHandle === null ? t('shell.noHandle') : `@${link.madeByHandle}`,
          },
        ]}
      />
      {link.status === 'active' && !isRevokeOpen && (
        <div>
          <Button
            variant="secondary"
            aria-label={t('invites.revoke.openLabel', { note })}
            onClick={() => setIsRevokeOpen(true)}
          >
            {t('invites.revoke.open')}
          </Button>
        </div>
      )}
      {link.status === 'active' && isRevokeOpen && (
        <RevokeForm link={link} isRevoking={isRevoking} onRevoke={onRevoke} />
      )}
    </li>
  );
}
