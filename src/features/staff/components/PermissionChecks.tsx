/**
 * PermissionChecks: the permission checkboxes of one staff member (story S1-E2-07a;
 * architecture 1.8.3: safeguarding, teacher checks, on call for removal orders; picture review and
 * the intern marker from bundle ADMIN-2, part e2a, Robert's brief of 2 Nov 2026, section 5).
 *
 * The database refuses picture review for anyone under 18 or marked as an intern, and marking
 * someone an intern takes picture review away; the page shows the refusal it sends back.
 * Who shows it: StaffMemberCard, which supplies the reason and sends the change.
 */
import { useTranslation } from 'react-i18next';

import type { StaffMember, StaffPermission } from '../api/staffRoles';

/** Every permission, in the order architecture 1.8.3 lists them. */
const allPermissions: StaffPermission[] = [
  'safeguarding',
  'teacher_checks',
  'on_call',
  'picture_review',
];

/** What the checkboxes need. */
interface PermissionChecksProps {
  member: StaffMember;
  isChanging: boolean;
  onToggle: (permission: StaffPermission, shouldHold: boolean) => void;
  onInternToggle: (isIntern: boolean) => void;
}

/**
 * Renders the checkboxes in a labelled group.
 *
 * @returns the fieldset
 */
export function PermissionChecks({
  member,
  isChanging,
  onToggle,
  onInternToggle,
}: PermissionChecksProps) {
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
      <label className="flex min-h-11 items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          className="size-5"
          checked={member.isIntern}
          disabled={isChanging}
          onChange={(event) => onInternToggle(event.target.checked)}
        />
        {t('roles.intern')}
      </label>
      <p className="m-0 text-[13px] text-meta">{t('roles.permissionsHint')}</p>
    </fieldset>
  );
}
