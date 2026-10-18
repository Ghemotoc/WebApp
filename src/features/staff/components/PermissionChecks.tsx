/**
 * PermissionChecks: the three permission checkboxes of one staff member (story S1-E2-07a;
 * architecture 1.8.3: safeguarding, teacher checks, on call for removal orders).
 *
 * Who shows it: StaffMemberCard, which supplies the reason and sends the change.
 */
import { useTranslation } from 'react-i18next';

import type { StaffMember, StaffPermission } from '../api/staffRoles';

/** Every permission, in the order architecture 1.8.3 lists them. */
const allPermissions: StaffPermission[] = ['safeguarding', 'teacher_checks', 'on_call'];

/** What the checkboxes need. */
interface PermissionChecksProps {
  member: StaffMember;
  isChanging: boolean;
  onToggle: (permission: StaffPermission, shouldHold: boolean) => void;
}

/**
 * Renders the checkboxes in a labelled group.
 *
 * @returns the fieldset
 */
export function PermissionChecks({ member, isChanging, onToggle }: PermissionChecksProps) {
  const { t } = useTranslation('staff');
  return (
    <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
      <legend className="mb-1 text-sm font-semibold text-ink">{t('roles.permissions')}</legend>
      {allPermissions.map((permission) => (
        <label key={permission} className="flex min-h-11 items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            className="size-5"
            checked={member.permissions.includes(permission)}
            disabled={isChanging}
            onChange={(event) => onToggle(permission, event.target.checked)}
          />
          {t(`permissionNames.${permission}`)}
        </label>
      ))}
      <p className="m-0 text-[13px] text-meta">{t('roles.permissionsHint')}</p>
    </fieldset>
  );
}
