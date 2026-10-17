/**
 * GrantRoleForm: "Give someone a role" on /staff/roles (story S1-E2-07a).
 *
 * The role list shows only what the signed-in person may give: an owner any role, an admin
 * moderator, support and content editor (architecture 1.8.3). The database checks it again, with
 * the reason and the rule that nobody changes their own role.
 * Who shows it: StaffRolesPage. What it calls: the change() it is given (useStaffRoles).
 */
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Select } from '@/components/ui/Select';
import { TextInput } from '@/components/ui/TextInput';

import type { StaffChange, StaffRole } from '../api/staffRoles';

/** The roles an admin may give; an owner may also give owner and admin. */
const adminRoles: StaffRole[] = ['moderator', 'support', 'content_editor'];
const ownerRoles: StaffRole[] = ['owner', 'admin', ...adminRoles];

/** What the form needs. */
interface GrantRoleFormProps {
  isOwner: boolean;
  isChanging: boolean;
  onChange: (change: StaffChange) => Promise<void>;
}

/**
 * Renders the form.
 *
 * @returns the form
 */
export function GrantRoleForm({ isOwner, isChanging, onChange }: GrantRoleFormProps) {
  const { t } = useTranslation('staff');
  const roles = isOwner ? ownerRoles : adminRoles;
  const [handle, setHandle] = useState('');
  const [role, setRole] = useState<StaffRole>('moderator');
  const [reason, setReason] = useState('');
  const [problem, setProblem] = useState<string | null>(null);

  /** Checks the two required fields, then asks the database. */
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (handle.trim() === '') return setProblem(t('roles.usernameMissing'));
    if (reason.trim() === '') return setProblem(t('roles.reasonMissing'));
    setProblem(null);
    // A refusal is shown by the page from useStaffRoles; nothing else to do here.
    await onChange({
      kind: 'grant_role',
      handle: handle.trim(),
      role,
      reason: reason.trim(),
    }).catch(() => undefined);
  }

  return (
    <form
      noValidate
      aria-labelledby="grant-role-heading"
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6"
      onSubmit={(event) => void handleSubmit(event)}
    >
      <h2 id="grant-role-heading" className="m-0 font-heading text-[22px] font-bold text-heading">
        {t('roles.grantHeading')}
      </h2>
      <TextInput
        id="grant-handle"
        label={t('roles.username')}
        value={handle}
        autoCapitalize="none"
        onChange={(event) => setHandle(event.target.value)}
      />
      <Select
        id="grant-role"
        label={t('roles.role')}
        isLabelVisible
        value={role}
        onChange={(value) => setRole(value as StaffRole)}
        options={roles.map((option) => ({ value: option, label: t(`roleNames.${option}`) }))}
      />
      <TextInput
        id="grant-reason"
        label={t('roles.reason')}
        hint={t('roles.reasonHint')}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
      {problem !== null && <Notice tone="error">{problem}</Notice>}
      <Button type="submit" className="self-start" disabled={isChanging}>
        {isChanging ? t('roles.changing') : t('roles.grant')}
      </Button>
    </form>
  );
}
