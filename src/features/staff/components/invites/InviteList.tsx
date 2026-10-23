/**
 * InviteList: "Links made", the list of every invite link (story S1-E11-17).
 *
 * Board (AdminUsers, Invites tab): the table of links; drawn as one InviteRow per link, which
 * reads well at every width. Who shows it: InvitesPage. What it calls: the revoke() it is given.
 */
import { useTranslation } from 'react-i18next';

import type { InviteLink } from '../../api/inviteLinks';

import { InviteRow } from './InviteRow';

/** What the list needs. */
interface InviteListProps {
  links: InviteLink[];
  isLoading: boolean;
  isRevoking: boolean;
  onRevoke: (inviteId: string, reason: string) => Promise<unknown>;
}

/**
 * Renders the list.
 *
 * @returns the section with its heading and rows, or a plain note while loading or when empty
 */
export function InviteList({ links, isLoading, isRevoking, onRevoke }: InviteListProps) {
  const { t } = useTranslation('staff');
  return (
    <section aria-labelledby="invites-list-heading" className="flex flex-col gap-4">
      <h2 id="invites-list-heading" className="m-0 font-heading text-[24px] font-bold text-heading">
        {t('invites.listHeading')}
      </h2>
      {isLoading && <p className="m-0 text-meta">{t('invites.loading')}</p>}
      {!isLoading && links.length === 0 && <p className="m-0 text-body">{t('invites.none')}</p>}
      <ul className="m-0 flex list-none flex-col gap-4 p-0">
        {links.map((link) => (
          <InviteRow key={link.id} link={link} isRevoking={isRevoking} onRevoke={onRevoke} />
        ))}
      </ul>
    </section>
  );
}
