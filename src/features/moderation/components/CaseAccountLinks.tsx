/**
 * CaseAccountLinks: "Possible returning user" on a profile case: the accounts linked to the
 * case's account (automatically, when a sign-up shared a scrambled IP with an account banned in
 * the last 30 days, or by a moderator), with "Remove link" and "Link another account" (bundle
 * ADMIN-2, part f2; Robert's brief of 2 Nov 2026, section 6). The flag never blocks anyone: the
 * moderator decides with the usual Decision form.
 *
 * Who shows it: CasePage, for a case about a profile. Plain components, no doodles.
 * What it calls: useCaseAccountLinks → api/caseAccountLinks.ts.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { InfoPill } from '@/components/ui/InfoPill';
import { Notice } from '@/components/ui/Notice';

import type { CaseAccountLink } from '../api/caseAccountLinks';
import { useCaseAccountLinks } from '../hooks/useCaseAccountLinks';

import { LinkAccountForm } from './LinkAccountForm';
import { ReasonForm } from './ReasonForm';

type Links = ReturnType<typeof useCaseAccountLinks>;

/**
 * A date and time in the page's language.
 *
 * @returns the formatted text
 */
function useWhenText() {
  const { i18n } = useTranslation('moderation');
  return (isoTime: string) =>
    new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(isoTime),
    );
}

/**
 * One linked account: its username (to its staff page), whether it is banned, where the link
 * came from and why, and "Remove link".
 *
 * @returns a list item
 */
function LinkRow({ link, links }: { link: CaseAccountLink; links: Links }) {
  const { t } = useTranslation('moderation');
  const whenText = useWhenText();
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);
  const origin =
    link.linkedBy === null
      ? t('accountLinks.byCheck', { when: whenText(link.createdAt) })
      : t('accountLinks.byModerator', { handle: link.linkedBy, when: whenText(link.createdAt) });
  return (
    <li className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          to={`/staff/users/${link.userId}`}
          className="font-semibold text-link underline"
        >{`@${link.handle}`}</Link>
        <InfoPill tone="neutral">{t(`accountLinks.sources.${link.source}`)}</InfoPill>
        {link.bannedAt !== null && (
          <InfoPill tone="blush">
            {t('accountLinks.bannedSince', { when: whenText(link.bannedAt) })}
          </InfoPill>
        )}
      </div>
      <p className="m-0 text-sm text-meta">{origin}</p>
      {/* The automatic reason is stored in English, so the panel says it in the page's language. */}
      <p className="m-0 text-body">
        {link.source === 'sign_up_ip' ? t('accountLinks.automaticReason') : link.reason}
      </p>
      {isRemoveOpen ? (
        <ReasonForm
          id={`unlink-${link.id}`}
          label={t('accountLinks.removeReason')}
          confirmLabel={t('accountLinks.removeConfirm')}
          isBusy={links.isChanging}
          onConfirm={(reason) => links.change({ kind: 'unlink', linkId: link.id, reason })}
          onCancel={() => setIsRemoveOpen(false)}
        />
      ) : (
        <div>
          <Button variant="secondary" onClick={() => setIsRemoveOpen(true)}>
            {t('accountLinks.remove', { handle: link.handle })}
          </Button>
        </div>
      )}
    </li>
  );
}

/**
 * The plain-words refusal: the database's "refused" means a wrong username, the case's own
 * account, a link that already exists or a missing reason.
 *
 * @returns the error notice, or nothing
 */
function ChangeFailure({ links }: { links: Links }) {
  const { t } = useTranslation('moderation');
  if (links.changeFailure === null) return null;
  const message =
    links.changeFailure === 'refused'
      ? t('accountLinks.refused')
      : t(`failures.${links.changeFailure}`);
  return <Notice tone="error">{message}</Notice>;
}

/**
 * Renders the panel.
 *
 * @param caseId - the case, about a profile
 * @returns the section
 */
export function CaseAccountLinks({ caseId }: { caseId: string }) {
  const { t } = useTranslation('moderation');
  const links = useCaseAccountLinks(caseId);
  const [isLinkOpen, setIsLinkOpen] = useState(false);
  return (
    <section aria-labelledby="case-account-links-heading" className="flex flex-col gap-4">
      <h2
        id="case-account-links-heading"
        className="m-0 font-heading text-[24px] font-bold text-heading"
      >
        {t('accountLinks.heading')}
      </h2>
      <p className="m-0 text-body">{t('accountLinks.intro')}</p>
      {links.failure !== null && <Notice tone="error">{t(`failures.${links.failure}`)}</Notice>}
      {links.links.length === 0 ? (
        <p className="m-0 text-meta">{t('accountLinks.none')}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {links.links.map((link) => (
            <LinkRow key={link.id} link={link} links={links} />
          ))}
        </ul>
      )}
      <ChangeFailure links={links} />
      {isLinkOpen ? (
        <LinkAccountForm
          caseId={caseId}
          isBusy={links.isChanging}
          onLink={(handle, reason) => links.change({ kind: 'link', caseId, handle, reason })}
          onCancel={() => setIsLinkOpen(false)}
        />
      ) : (
        <div>
          <Button variant="secondary" onClick={() => setIsLinkOpen(true)}>
            {t('accountLinks.link')}
          </Button>
        </div>
      )}
    </section>
  );
}
