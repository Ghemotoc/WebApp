/**
 * LegalUpdateNotice: "We've updated our Terms", shown to a signed-in person who must accept a new
 * important version before posting again (story S1-E14-01; board 7.2, "What you see after an
 * important change").
 *
 * Who shows it: AppLayout (src/app/shell/AppLayout.tsx), at the top of every page, so it can't be
 * missed. The board draws it as a dialog; here it is a panel that doesn't block the page, because
 * reading never stops ("You can keep reading meanwhile") and the database refuses posting anyway
 * (account_state() answers legal_acceptance_required).
 * What it calls: useLegalAcceptance (my_legal_documents_to_accept() and
 * accept_current_legal_versions()). Signed out, or with nothing waiting, it shows nothing.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import type { DocumentToAccept } from '../api/legalDocuments';
import { useLegalAcceptance } from '../hooks/useLegalAcceptance';

/**
 * The heading: the document's name when one is waiting, "our rules" when several are.
 *
 * @param documents - the documents waiting
 * @returns the heading text
 */
function useNoticeTitle(documents: DocumentToAccept[]): string {
  const { t } = useTranslation('legal');
  const [onlyDocument] = documents;
  if (documents.length === 1 && onlyDocument !== undefined) {
    return t('update.titleOne', { document: t(`documents.${onlyDocument.document_slug}.name`) });
  }
  return t('update.titleMany');
}

/**
 * Renders the notice, or nothing.
 *
 * @returns the panel when something waits for the signed-in person
 */
export function LegalUpdateNotice() {
  const { t } = useTranslation('legal');
  const { documentsToAccept, accept, isAccepting, acceptFailed } = useLegalAcceptance();
  const title = useNoticeTitle(documentsToAccept);
  const [firstDocument] = documentsToAccept;
  if (firstDocument === undefined) return null;

  return (
    <PageContainer className="pt-6">
      <section
        aria-labelledby="legal-update-title"
        className="flex flex-col gap-3 rounded-card border border-border bg-tint p-6"
      >
        <Eyebrow>{t('update.eyebrow')}</Eyebrow>
        <h2 id="legal-update-title" className="m-0 font-heading text-[24px] font-bold text-heading">
          {title}
        </h2>
        {/* What changed, per document, when the version says so. */}
        {documentsToAccept.map((document) =>
          document.change_summary ? (
            <p key={document.document_slug} className="m-0 text-body">
              {t('update.change', {
                version: document.version_label,
                document: t(`documents.${document.document_slug}.name`),
                summary: document.change_summary,
              })}
            </p>
          ) : null,
        )}
        <p className="m-0 text-body">{t('update.body')}</p>
        {acceptFailed && <Notice tone="error">{t('update.failed')}</Notice>}
        <div className="flex flex-wrap gap-3">
          <Link
            to={`/legal/${firstDocument.document_slug}`}
            className="inline-flex h-11 items-center rounded-full border border-control-border bg-surface px-5 text-sm font-semibold text-heading no-underline hover:bg-tint"
          >
            {t('update.read')}
          </Link>
          <Button
            disabled={isAccepting}
            onClick={() => accept(documentsToAccept.map((document) => document.document_slug))}
          >
            {isAccepting ? t('update.accepting') : t('update.accept')}
          </Button>
        </div>
      </section>
    </PageContainer>
  );
}
