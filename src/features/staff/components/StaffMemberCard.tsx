/**
 * StaffMemberCard: one staff member on /staff/roles, with their roles and permissions
 * (story S1-E2-07a).
 *
 * Each role has a "Remove" button and each permission a checkbox; both use the reason typed in
 * this card, which the database requires and writes to the audit log. Plain components only
 * (staff screens have no doodles, CLAUDE.md).
 * Who shows it: StaffRolesPage. What it calls: the change() it is given (useStaffRoles).
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextInput } from '@/components/ui/TextInput';

import type { StaffChange, StaffMember } from '../api/staffRoles';

import { PermissionChecks } from './PermissionChecks';
import { StaffLanguages } from './StaffLanguages';

/** What a card needs. */
interface StaffMemberCardProps {
  member: StaffMember;
  isChanging: boolean;
  onChange: (change: StaffChange) => Promise<void>;
}

/**
 * Renders the card.
 *
 * @returns the card
 */
export function StaffMemberCard({ member, isChanging, onChange }: StaffMemberCardProps) {
  const { t } = useTranslation('staff');
  const [reason, setReason] = useState('');
  const [reasonMissing, setReasonMissing] = useState(false);
  const handle = member.handle ?? t('roles.noHandle');
  const headingId = `staff-member-${member.userId}`;

  /** Sends a change once a reason is written; a refusal is shown by the page. */
  function send(change: StaffChange) {
    if (reason.trim() === '') return setReasonMissing(true);
    setReasonMissing(false);
    void onChange(change).catch(() => undefined);
  }

  return (
    <li
      aria-labelledby={headingId}
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-6"
    >
      <h3 id={headingId} className="m-0 text-base font-bold text-heading">
        @{handle}
      </h3>
      <TextInput
        id={`${headingId}-reason`}
        label={t('roles.reason')}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
      {reasonMissing && <Notice tone="error">{t('roles.reasonMissing')}</Notice>}
      <div className="flex flex-wrap gap-2">
        {member.roles.map((role) => (
          <Button
            key={role}
            variant="secondary"
            disabled={isChanging}
            aria-label={t('roles.removeLabel', { role: t(`roleNames.${role}`), handle })}
            onClick={() =>
              send({ kind: 'remove_role', userId: member.userId, role, reason: reason.trim() })
            }
          >
            {t('roles.remove', { role: t(`roleNames.${role}`) })}
          </Button>
        ))}
      </div>
      <PermissionChecks
        member={member}
        isChanging={isChanging}
        onToggle={(permission, shouldHold) =>
          send({
            kind: 'set_permission',
            userId: member.userId,
            permission,
            shouldHold,
            reason: reason.trim(),
          })
        }
      />
      <StaffLanguages userId={member.userId} handle={handle} />
    </li>
  );
}
