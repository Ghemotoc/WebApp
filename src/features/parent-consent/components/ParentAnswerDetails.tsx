/**
 * ParentAnswerDetails: what a parent or guardian reads before answering, screen 2.4, right side
 * (story S1-E2-03, criterion 2; board ParentConsent.dc.html, "Your child wants to join").
 *
 * Who shows it: ParentAnswerPage, while the request waits for an answer.
 * What it shows: who asked (email, username, year of birth, the age check), what the platform is,
 * what we keep, how we protect under-18s, and the privacy notice and terms with their versions.
 * The facts come from parental_consent_request(); the words from account.json.
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import type { ConsentRequestDetails } from '../api/parentConsent';

/** The four protections, in the board's order. */
const protectionKeys = ['protectMessages', 'protectReports', 'protectRatings', 'protectAds'];

/** The class of a link in running text. */
const textLinkClass = 'text-link underline hover:text-link-hover';

/**
 * One titled block of the details.
 *
 * @returns the block
 */
function DetailBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="m-0 font-heading text-lg font-semibold text-heading">{title}</h2>
      {children}
    </section>
  );
}

/**
 * The privacy notice and the terms, each opening in a new tab with its version.
 *
 * @returns the links
 */
function LegalLinks({ request }: { request: ConsentRequestDetails }) {
  const { t } = useTranslation('account');
  const links = [
    { slug: 'privacy', key: 'privacyLink', version: request.privacyVersion },
    { slug: 'terms', key: 'termsLink', version: request.termsVersion },
  ];
  return (
    <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-body">
      {links.map((link) => (
        <li key={link.slug}>
          <a href={`/legal/${link.slug}`} target="_blank" rel="noopener" className={textLinkClass}>
            {t(`parentConsent.parent.${link.key}`, { version: link.version ?? '1' })}
          </a>
        </li>
      ))}
    </ul>
  );
}

/**
 * Renders the details.
 *
 * @param request - what the link points to
 * @returns the blocks a parent reads before answering
 */
export function ParentAnswerDetails({ request }: { request: ConsentRequestDetails }) {
  const { t } = useTranslation('account');
  return (
    <div className="flex flex-col gap-5">
      <DetailBlock title={t('parentConsent.parent.whatHeading')}>
        <p className="m-0 text-body">{t('parentConsent.parent.whatBody')}</p>
      </DetailBlock>
      <DetailBlock title={t('parentConsent.parent.keepHeading')}>
        <p className="m-0 text-body">{t('parentConsent.parent.keepBody')}</p>
      </DetailBlock>
      <DetailBlock title={t('parentConsent.parent.protectHeading')}>
        <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5 text-body">
          {protectionKeys.map((key) => (
            <li key={key}>{t(`parentConsent.parent.${key}`)}</li>
          ))}
        </ul>
      </DetailBlock>
      <DetailBlock title={t('parentConsent.parent.legalIntro')}>
        <LegalLinks request={request} />
      </DetailBlock>
    </div>
  );
}
