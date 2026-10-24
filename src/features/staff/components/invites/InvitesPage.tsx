/**
 * InvitesPage: /staff/users/invites, where an owner or admin makes invite links for the March test and
 * sees the ones made (story S1-E11-17; decided 17 Oct 2026, 13:01; the March test is invited
 * adults only, decided 17 Oct 2026, 12:44).
 *
 * Board: AdminUsers (8.5), the Invites tab: /staff/users/invites since S1-E11-02, under the Users
 * tabs (/staff/invites redirects here). Plain components, no doodles.
 * Who shows it: the router, inside StaffLayout. The database refuses anyone but owner and admin
 * (admin_list_invites()), and the page says so.
 * What it calls: useInviteLinks → api/inviteLinks.ts.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import { useInviteLinks } from '../../hooks/useInviteLinks';

import { InviteList } from './InviteList';
import { MakeInviteForm } from './MakeInviteForm';
import { NewInviteLink } from './NewInviteLink';
import { UsersTabs } from '../users/UsersTabs';

/** useInviteLinks's result, passed down once. */
type Invites = ReturnType<typeof useInviteLinks>;

/**
 * "Make an invite link": the button, the form once opened, and the new link shown once.
 *
 * @param props.invites - useInviteLinks's result
 * @returns the maker panel
 */
function InviteMaker({ invites }: { invites: Invites }) {
  const { t } = useTranslation('staff');
  const [isFormOpen, setIsFormOpen] = useState(false);

  /** Makes the link, then closes the form so the new link stands alone. */
  async function make(request: Parameters<Invites['make']>[0]) {
    await invites.make(request);
    setIsFormOpen(false);
  }

  return (
    <>
      {isFormOpen ? (
        <MakeInviteForm
          isMaking={invites.isMaking}
          onMake={make}
          onCancel={() => setIsFormOpen(false)}
        />
      ) : (
        <div>
          <Button onClick={() => setIsFormOpen(true)}>{t('invites.open')}</Button>
        </div>
      )}
      {invites.makeFailure !== null && (
        <Notice tone="error">{t(`invites.failures.${invites.makeFailure}`)}</Notice>
      )}
      {invites.newInvite !== null && (
        <NewInviteLink invite={invites.newInvite} onDismiss={invites.forgetNewInvite} />
      )}
    </>
  );
}

/**
 * What goes under the heading: a refusal, an error, or the maker and the list.
 *
 * @param props.invites - useInviteLinks's result
 * @returns the page's body
 */
function InvitesBody({ invites }: { invites: Invites }) {
  const { t } = useTranslation('staff');
  if (invites.loadFailure === 'not_allowed') {
    return <p className="m-0 text-body">{t('invites.notAllowed')}</p>;
  }
  if (invites.loadFailure !== null) {
    return <Notice tone="error">{t(`invites.failures.${invites.loadFailure}`)}</Notice>;
  }
  return (
    <>
      <InviteMaker invites={invites} />
      {invites.revokeFailure !== null && (
        <Notice tone="error">{t(`invites.failures.${invites.revokeFailure}`)}</Notice>
      )}
      <InviteList
        links={invites.links}
        isLoading={invites.isLoading}
        isRevoking={invites.isRevoking}
        onRevoke={invites.revoke}
      />
    </>
  );
}

/**
 * Renders the page.
 *
 * @returns the Invites screen
 */
export function InvitesPage() {
  const { t } = useTranslation('staff');
  const invites = useInviteLinks();
  return (
    <PageContainer className="flex flex-col gap-6 pt-12 pb-7">
      <title>{t('invites.documentTitle')}</title>
      <div className="flex max-w-[720px] flex-col gap-2">
        <Eyebrow>{t('invites.eyebrow')}</Eyebrow>
        <h1 className="m-0 font-heading text-[34px] font-bold text-heading">
          {t('invites.heading')}
        </h1>
        <p className="m-0 text-body">{t('invites.intro')}</p>
      </div>
      <UsersTabs />
      <div className="flex max-w-[860px] flex-col gap-6">
        <InvitesBody invites={invites} />
      </div>
    </PageContainer>
  );
}
