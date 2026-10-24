/**
 * LegalCentrePage: the Legal centre, screen 7.2 (story S1-E14-01).
 *
 * Who shows it: the router (src/app/router.tsx) for /legal/:documentSlug; /legal goes to the terms.
 * The footer, the sign-up form (S1-E2-01) and Settings (S1-E2-04) link here.
 * What it shows: the board's header (eyebrow, heading, lead), the row of documents, then the chosen
 * document (LegalDocumentView) in the interface language when that text exists.
 * What it calls: useLegalVersions → api/legalDocuments.ts → public.legal_document_versions.
 * Public page: no sign-in needed, and no ads on legal pages (terms, section 6).
 */
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SafetyContactsBlock } from '@/features/safety/components/SafetyContactsBlock';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import { useLegalVersions } from '../hooks/useLegalVersions';
import { chooseLegalVersion } from '../lib/chooseLegalVersion';
import { isLegalDocumentSlug, type LegalDocumentSlug } from '../lib/legalDocumentList';

import { LegalDocumentNav } from './LegalDocumentNav';
import { LegalDocumentView } from './LegalDocumentView';

/**
 * Loads one document and shows it, or says plainly why it can't.
 *
 * @returns the loading line, an error with "Try again", or the document
 */
function LegalDocumentLoader({ documentSlug }: { documentSlug: LegalDocumentSlug }) {
  const { t, i18n } = useTranslation('legal');
  const versions = useLegalVersions(documentSlug);

  // Step 1: still loading.
  if (versions.isPending) return <p className="m-0 text-body">{t('loading')}</p>;
  // Step 2: the database couldn't be reached; say so and offer to try again.
  if (versions.isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <Notice tone="error" title={t('loadFailed.title')}>
          {t('loadFailed.body')}
        </Notice>
        <Button variant="secondary" onClick={() => void versions.refetch()}>
          {t('loadFailed.retry')}
        </Button>
      </div>
    );
  }
  // Step 3: pick the version and language, then show it.
  const chosen = chooseLegalVersion(versions.data, i18n.language);
  if (chosen.current === null) {
    return <EmptyState title={t('notFound.title')} description={t('notFound.body')} />;
  }
  return (
    <LegalDocumentView
      documentSlug={documentSlug}
      chosen={{ ...chosen, current: chosen.current }}
    />
  );
}

/**
 * Renders the Legal centre for the document in the address.
 *
 * @returns the page
 */
export function LegalCentrePage() {
  const { t } = useTranslation('legal');
  const { documentSlug } = useParams();
  const knownSlug = isLegalDocumentSlug(documentSlug) ? documentSlug : null;
  const documentTitle = knownSlug === null ? t('eyebrow') : t(`documents.${knownSlug}.name`);

  return (
    <PageContainer className="tmc-rise flex flex-col gap-6 pt-12 pb-7">
      <title>{t('documentTitle', { documentTitle })}</title>
      {/* The board's header. */}
      <div className="flex flex-col gap-3">
        <Eyebrow>{t('eyebrow')}</Eyebrow>
        <h1 className="m-0 text-[clamp(32px,4vw,52px)] leading-[1.02] font-extrabold tracking-[-0.02em] break-words">
          {t('heading')}
        </h1>
        <p className="m-0 max-w-[720px] text-lg leading-[1.6] text-body">{t('lead')}</p>
      </div>
      <LegalDocumentNav />
      {knownSlug === null ? (
        <EmptyState title={t('notFound.title')} description={t('notFound.body')} />
      ) : (
        <LegalDocumentLoader key={knownSlug} documentSlug={knownSlug} />
      )}
      {/* The contact page points at the Contact us form (S1-E14-04) and carries the helplines for
          the visitor's country (S1-E10-13a, Q9d). */}
      {knownSlug === 'contact' && (
        <p className="m-0 text-body">
          {t('contactUs.text')}{' '}
          <Link to="/contact" className="font-semibold text-link underline">
            {t('contactUs.link')}
          </Link>
        </p>
      )}
      {/* The public report form and the removal-order contact point (S1-E10-02). */}
      {knownSlug === 'contact' && (
        <p className="m-0 text-body">
          {t('reportForm.text')}{' '}
          <Link to="/report" className="font-semibold text-link underline">
            {t('reportForm.link')}
          </Link>{' '}
          <Link to="/report?kind=removal_order" className="font-semibold text-link underline">
            {t('reportForm.orderLink')}
          </Link>
        </p>
      )}
      {knownSlug === 'contact' && <SafetyContactsBlock />}
    </PageContainer>
  );
}
