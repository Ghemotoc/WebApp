/**
 * CustomRolesSection: "Custom roles" on /staff/roles (story S1-E11-33, bundle CMS-2a).
 *
 * The owner or an admin makes a role with exactly the access a job needs (for example Marketing)
 * and gives it to people. It lists the roles, opens the form to make or change one, and shows the
 * database's answer to the last change.
 * Who shows it: StaffRolesPage, under the staff list. What it calls: useCustomRoles.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import { useCustomRoles } from '../hooks/useCustomRoles';

import { CustomRoleCard } from './CustomRoleCard';
import { CustomRoleForm } from './CustomRoleForm';

/** Which form is open: none, a new role, or the id of the role being changed. */
type OpenForm = null | 'new' | string;

/**
 * Shows the database's answer to the last change.
 *
 * @param props.roles - useCustomRoles's result
 * @returns a notice, or nothing
 */
function ChangeAnswer({ roles }: { roles: ReturnType<typeof useCustomRoles> }) {
  const { t } = useTranslation('staff');
  if (roles.changeSucceeded) return <Notice tone="success">{t('customRoles.saved')}</Notice>;
  if (roles.changeFailure === null) return null;
  // Custom role refusals have their own words; the rest are the Roles page's own.
  const message = t(`customRoles.failures.${roles.changeFailure}`, {
    defaultValue: t(`roles.failures.${roles.changeFailure}`),
  });
  return (
    <Notice tone="error">
      {message}{' '}
      {roles.changeFailure === 'sign_in_again' && (
        <Link to="/sign-in" className="font-semibold underline">
          {t('roles.signInAgain')}
        </Link>
      )}
    </Notice>
  );
}

/**
 * Renders the section.
 *
 * @returns the section, or a short message when the roles can't be read
 */
export function CustomRolesSection() {
  const { t } = useTranslation('staff');
  const roles = useCustomRoles();
  const [openForm, setOpenForm] = useState<OpenForm>(null);
  if (roles.isLoading || roles.loadFailure === 'not_allowed') return null;
  const editing = roles.overview.roles.find((role) => role.id === openForm) ?? null;

  /** Opens a form, forgetting the answer to the change before it. */
  function open(form: OpenForm) {
    roles.resetChange();
    setOpenForm(form);
  }

  return (
    <section aria-labelledby="custom-roles-heading" className="flex flex-col gap-4">
      <h2 id="custom-roles-heading" className="m-0 font-heading text-[22px] font-bold text-heading">
        {t('customRoles.heading')}
      </h2>
      <p className="m-0 text-body">{t('customRoles.intro')}</p>
      {roles.loadFailure !== null && <Notice tone="error">{t('customRoles.loadFailed')}</Notice>}
      <ChangeAnswer roles={roles} />
      {openForm === null && (
        <Button type="button" className="self-start" onClick={() => open('new')}>
          {t('customRoles.make')}
        </Button>
      )}
      {openForm !== null && (
        <CustomRoleForm
          key={openForm}
          role={editing}
          assignable={roles.overview.assignable}
          isChanging={roles.isChanging}
          onSave={roles.change}
          onClose={() => setOpenForm(null)}
        />
      )}
      {roles.overview.roles.length === 0 ? (
        <p className="m-0 text-sm text-meta">{t('customRoles.empty')}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-4 p-0">
          {roles.overview.roles.map((role) => (
            <CustomRoleCard
              key={role.id}
              role={role}
              isChanging={roles.isChanging}
              onChange={roles.change}
              onEdit={() => open(role.id)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
