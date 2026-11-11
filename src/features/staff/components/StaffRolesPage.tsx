/**
 * StaffRolesPage: /staff/roles, the plain page to manage staff roles and permissions (story
 * S1-E2-07a; decided 17 Oct 2026, 19:43, Q14c), inside the admin shell since S1-E11-01.
 *
 * Who shows it: the router, inside StaffLayout, loaded only when someone opens it (architecture
 * 1.8.1: staff code never ships in the reader's bundle). Only owner and admin get the list; the database
 * refuses everyone else (admin_list_staff()), and the page says so.
 * What it calls: useStaffRoles → api/staffRoles.ts, and CustomRolesSection for custom roles
 * (S1-E11-33).
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import { useStaffRoles } from '../hooks/useStaffRoles';
import { registerStaffTranslations } from '../registerStaffTranslations';

import { CustomRolesSection } from './CustomRolesSection';
import { GrantRoleForm } from './GrantRoleForm';
import { StaffMemberCard } from './StaffMemberCard';

/**
 * What goes under the heading: a message, or the form and the list.
 *
 * @param props.roles - useStaffRoles's result
 * @returns the page's body
 */
function StaffRolesBody({ roles }: { roles: ReturnType<typeof useStaffRoles> }) {
  const { t } = useTranslation('staff');
  if (roles.isLoading) return null;
  if (!roles.isSignedIn) return <p className="m-0 text-body">{t('roles.signedOut')}</p>;
  if (roles.loadFailure === 'not_allowed')
    return <p className="m-0 text-body">{t('roles.notAllowed')}</p>;
  if (roles.loadFailure !== null) return <Notice tone="error">{t('roles.loadFailed')}</Notice>;
  return (
    <>
      {roles.changeFailure !== null && (
        <Notice tone="error">
          {t(`roles.failures.${roles.changeFailure}`)}{' '}
          {/* A role change needs a sign-in from the last 15 minutes (S1-E11-01). */}
          {roles.changeFailure === 'sign_in_again' && (
            <Link to="/sign-in" className="font-semibold underline">
              {t('roles.signInAgain')}
            </Link>
          )}
        </Notice>
      )}
      {roles.changeSucceeded && <Notice tone="success">{t('roles.changed')}</Notice>}
      <GrantRoleForm
        isOwner={roles.isOwner}
        isChanging={roles.isChanging}
        onChange={roles.change}
      />
      <ul className="m-0 flex list-none flex-col gap-4 p-0">
        {roles.staff.map((member) => (
          <StaffMemberCard
            key={member.userId}
            member={member}
            isChanging={roles.isChanging}
            onChange={roles.change}
          />
        ))}
      </ul>
      {/* Custom roles: a name and the access a job needs, given to people (S1-E11-33, CMS-2a). */}
      <CustomRolesSection />
    </>
  );
}

/**
 * Renders the page.
 *
 * @returns the staff roles screen
 */
export function StaffRolesPage() {
  const { i18n } = useTranslation();
  registerStaffTranslations(i18n);
  const { t } = useTranslation('staff');
  const roles = useStaffRoles();
  return (
    <PageContainer className="flex flex-col gap-6 pt-12 pb-7">
      <title>{t('roles.documentTitle')}</title>
      <div className="flex max-w-[720px] flex-col gap-2">
        <Eyebrow>{t('roles.eyebrow')}</Eyebrow>
        <h1 className="m-0 font-heading text-[34px] font-bold text-heading">
          {t('roles.heading')}
        </h1>
        <p className="m-0 text-body">{t('roles.intro')}</p>
        <p className="m-0 text-sm text-meta">{t('roles.staffAccountNote')}</p>
      </div>
      <div className="flex max-w-[720px] flex-col gap-6">
        <StaffRolesBody roles={roles} />
      </div>
    </PageContainer>
  );
}
